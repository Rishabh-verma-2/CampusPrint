import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Check,
  ArrowRight,
  User as UserIcon,
  Hash,
  FileText,
  Printer,
  Clock,
  Sparkles,
  Keyboard,
  X,
  Phone,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { printJobApi } from '../../api/printJobApi';
import { StatusBadge, Spinner, EmptyState } from '../../components/ui';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'sonner';
import type { PrintJob } from '../../types';

const QUEUE_TABS = [
  { key: 'all', label: 'All Active', statuses: ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY'] },
  { key: 'new', label: 'New / Pending', statuses: ['QUEUED'] },
  { key: 'printing', label: 'Printing', statuses: ['ACCEPTED', 'PRINTING'] },
  { key: 'ready', label: 'Ready for Pickup', statuses: ['READY'] },
  { key: 'completed', label: 'Completed', statuses: ['COLLECTED'] },
];

const VendorQueuePage: React.FC = () => {
  const [tab, setTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pickupModal, setPickupModal] = useState(false);
  const [pickupToken, setPickupToken] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ job: PrintJob } | null>(null);

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { socket } = useSocket();

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendorQueue', tab],
    queryFn: () => vendorApi.getQueue({ status: tab, limit: 100 }).then((r) => r.data.data),
    refetchInterval: 15000,
  });

  const jobs: PrintJob[] = data?.jobs ?? [];

  // Real-time updates + reconnect sync
  React.useEffect(() => {
    if (!socket) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['vendorQueue'] });

    // On reconnect, immediately re-fetch to catch any orders missed while offline
    const handleConnect = () => {
      console.log('[VendorQueue] Socket connected/reconnected — syncing queue');
      refresh();
    };

    socket.on('connect', handleConnect);
    socket.on('printJob:new', refresh);
    socket.on('printJob:updated', refresh);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('printJob:new', refresh);
      socket.off('printJob:updated', refresh);
    };
  }, [socket, qc]);

  const actionMutation = useMutation({
    mutationFn: ({ action, id }: { action: string; id: string; printWindow?: Window | null }) => {
      const actions: Record<string, (id: string) => Promise<any>> = {
        accept: printJobApi.accept,
        start: printJobApi.start,
        ready: printJobApi.markReady,
      };
      return actions[action](id);
    },
    onSuccess: (response: any, variables) => {
      qc.invalidateQueries({ queryKey: ['vendorQueue'] });
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });

      if (variables.action === 'start') {
        const docUrl = response?.data?.data?.documentUrl;
        const printWin = variables.printWindow;
        if (docUrl) {
          if (printWin && !printWin.closed) {
            printWin.location.href = docUrl;
          } else {
            window.open(docUrl, '_blank', 'noopener,noreferrer');
          }
          toast.success('Printing started! Document opened in new tab.');
        } else {
          if (printWin && !printWin.closed) printWin.close();
          toast.success('Printing started');
        }
      } else {
        toast.success('Order status updated');
      }
    },
    onError: (_err, variables) => {
      if (variables.printWindow && !variables.printWindow.closed) {
        variables.printWindow.close();
      }
      toast.error('Action failed');
    },
  });

  const handleStartPrinting = (id: string) => {
    // Open a blank tab synchronously within user gesture to prevent popup blockers
    const printWindow = window.open('about:blank', '_blank');
    actionMutation.mutate({ action: 'start', id, printWindow });
  };

  const verifyMutation = useMutation({
    mutationFn: (token: string) => printJobApi.verifyToken(token).then((r) => r.data.data),
    onSuccess: (data) => setVerifyResult(data as { job: PrintJob }),
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Invalid token or job is not ready for pickup'),
  });

  const collectMutation = useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => printJobApi.collect(id, token),
    onSuccess: () => {
      toast.success('Order handed over successfully! Accrued to earnings.');
      setPickupModal(false);
      setVerifyResult(null);
      setPickupToken('');
      qc.invalidateQueries({ queryKey: ['vendorQueue'] });
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Confirmation failed. Please verify token.'),
  });

  // De-duplicate by _id first, then filter by search term
  const uniqueJobs = jobs.filter(
    (job, idx, arr) => arr.findIndex((j) => j._id === job._id) === idx
  );

  const filteredJobs = uniqueJobs.filter((job) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    const token = job.publicToken?.toLowerCase() || '';
    const studentObj = typeof job.studentId === 'object' ? (job.studentId as any) : null;
    const name = (job.customerName || studentObj?.name || '').toLowerCase();
    const identifier = (job.customerIdentifier || studentObj?.enrollmentNumber || studentObj?.phone || '').toLowerCase();
    const doc = job.documentId && typeof job.documentId === 'object' ? (job.documentId as any)?.originalName?.toLowerCase() : '';
    return token.includes(s) || name.includes(s) || identifier.includes(s) || doc?.includes(s);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* ─── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Print Order Queue
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage incoming orders, update printing statuses, and verify pickups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setPickupToken('');
              setVerifyResult(null);
              setPickupModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-xs transition-colors"
            id="verify-pickup-btn"
          >
            <Keyboard size={16} />
            <span>Verify Token</span>
          </button>
        </div>
      </div>

      {/* ─── Filter Tabs & Search Bar ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {QUEUE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search token, student, roll..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* ─── Order Cards Grid ────────────────────────────────────────────────── */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <EmptyState
            title="No print jobs match this filter"
            description="Incoming student orders will appear automatically in real-time."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const doc =
              job.documentId && typeof job.documentId === 'object'
                ? (job.documentId as { originalName: string; pageCount: number; fileSize?: number })
                : null;
            const studentObj =
              typeof job.studentId === 'object'
                ? (job.studentId as { name?: string; phone?: string; enrollmentNumber?: string })
                : null;
            const customerName = job.customerName || studentObj?.name || 'Walk-in Student';
            const customerIdentifier =
              job.customerIdentifier || studentObj?.enrollmentNumber || studentObj?.phone || '';

            return (
              <div
                key={job._id}
                className={`bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                  job.status === 'QUEUED'
                    ? 'border-amber-200 bg-amber-50/10'
                    : job.status === 'READY'
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Header: Public Token + Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="px-3 py-1 rounded-xl bg-blue-600 text-white font-extrabold text-base tracking-wider shadow-2xs font-mono">
                        {job.publicToken}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        {new Date(job.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-1 mb-3.5">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                      <UserIcon size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{customerName}</span>
                    </div>
                    {customerIdentifier && (
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                        <Hash size={13} className="text-slate-400 flex-shrink-0" />
                        <span>{customerIdentifier}</span>
                      </div>
                    )}
                  </div>

                  {/* Document and Print Specifications */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between gap-2 font-medium text-slate-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-blue-500 flex-shrink-0" />
                        <span className="truncate" title={doc?.originalName}>
                          {doc?.originalName || 'Document.pdf'}
                        </span>
                      </div>
                      {(job.isCustomPdf || (job.printConfig?.pageRanges && job.printConfig.pageRanges !== 'all')) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0">
                          Custom PDF
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/50">
                      <span>
                        {job.printConfig?.totalPages || doc?.pageCount || 1} pgs ×{' '}
                        {job.printConfig?.copies || 1} copy
                      </span>
                      <span className="font-semibold text-slate-800">
                        {job.printConfig?.colorMode === 'BW' ? 'B&W' : 'Color'} ·{' '}
                        {job.printConfig?.sides === 'DOUBLE' ? 'Duplex' : 'Single'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-900 pt-1 font-bold">
                      <span className="text-slate-500 font-normal">Order Total</span>
                      <span className="text-blue-600 text-sm">₹{job.pricing?.total}</span>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {job.status === 'QUEUED' && (
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ action: 'accept', id: job._id })}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                      id={`accept-${job._id}`}
                    >
                      Accept Order
                    </button>
                  )}

                  {job.status === 'ACCEPTED' && (
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() => handleStartPrinting(job._id)}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                      id={`start-${job._id}`}
                    >
                      <Printer size={14} />
                      <span>Start Printing</span>
                    </button>
                  )}

                  {job.status === 'PRINTING' && (
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ action: 'ready', id: job._id })}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                      id={`ready-${job._id}`}
                    >
                      <Check size={14} />
                      <span>Mark Ready</span>
                    </button>
                  )}

                  {job.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPickupToken(job.publicToken);
                        setVerifyResult(null);
                        setPickupModal(true);
                      }}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                      id={`collect-${job._id}`}
                    >
                      <CheckCircle2 size={14} />
                      <span>Verify & Hand Over</span>
                    </button>
                  )}

                  {job.status === 'COLLECTED' && (
                    <div className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Completed & Picked Up</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/vendor/orders/${job._id}`)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Pickup Verification Modal ───────────────────────────────────────── */}
      {pickupModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            setPickupModal(false);
            setVerifyResult(null);
            setPickupToken('');
          }}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-left relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setPickupModal(false);
                setVerifyResult(null);
                setPickupToken('');
              }}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Keyboard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Verify Pickup Token</h3>
                <p className="text-xs text-slate-500">Ask the student to say their token number, then type it below</p>
              </div>
            </div>

            {!verifyResult ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Student Token Number
                  </label>
                  <div className="mb-2 text-xs text-slate-400">
                    Student can say: <span className="font-mono font-bold text-slate-600">"CP-03"</span> or just <span className="font-mono font-bold text-slate-600">"3"</span> or <span className="font-mono font-bold text-slate-600">"03"</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 3 or 03 or CP-03"
                    value={pickupToken}
                    onChange={(e) => setPickupToken(e.target.value.trim())}
                    onKeyDown={(e) => e.key === 'Enter' && pickupToken && verifyMutation.mutate(pickupToken)}
                    className="w-full text-center text-3xl font-extrabold tracking-widest font-mono py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPickupModal(false);
                      setPickupToken('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!pickupToken || verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(pickupToken)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifyMutation.isPending ? <Spinner size="sm" /> : 'Verify Code'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 size={16} />
                    <span>Verified: Order Ready for Pickup!</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Student Name</span>
                      <span className="font-bold text-slate-900">
                        {verifyResult.job.customerName ||
                          (typeof verifyResult.job.studentId === 'object'
                            ? (verifyResult.job.studentId as any)?.name
                            : 'Student')}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Token</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {verifyResult.job.publicToken}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Pages & Copies</span>
                      <span className="font-medium text-slate-800">
                        {verifyResult.job.printConfig?.totalPages} pages ×{' '}
                        {verifyResult.job.printConfig?.copies}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Print Type</span>
                      <span className="font-medium text-slate-800">
                        {verifyResult.job.printConfig?.colorMode === 'BW' ? 'B&W' : 'Color'} ·{' '}
                        {verifyResult.job.printConfig?.sides === 'DOUBLE' ? 'Duplex' : 'Single'}
                      </span>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-emerald-200/60 font-bold">
                      <span className="text-slate-700">Total Paid</span>
                      <span className="text-emerald-700">₹{verifyResult.job.pricing?.total}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyResult(null);
                      setPickupToken('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={collectMutation.isPending}
                    onClick={() =>
                      collectMutation.mutate({
                        id: verifyResult.job._id,
                        token: verifyResult.job.publicToken,
                      })
                    }
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {collectMutation.isPending ? <Spinner size="sm" /> : 'Confirm Handover'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorQueuePage;
