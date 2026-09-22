import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Phone,
  User as UserIcon,
  Hash,
  FileText,
  CheckCircle2,
  Printer,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
  Keyboard,
  ShieldCheck,
  X,
} from 'lucide-react';
import { printJobApi } from '../../api/printJobApi';
import { StatusBadge, Spinner, ErrorState } from '../../components/ui';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { toast } from 'sonner';
import type { PrintJob } from '../../types';

const VendorOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pickupTokenInput, setPickupTokenInput] = useState('');
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendorJob', id],
    queryFn: () => printJobApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const job: PrintJob | undefined = data?.job;
  const documentUrl: string | undefined = data?.documentUrl;

  const actionMutation = useMutation({
    mutationFn: ({ action, printWindow }: { action: string; printWindow?: Window | null }) => {
      const actions: Record<string, () => Promise<any>> = {
        accept: () => printJobApi.accept(id!),
        start: () => printJobApi.start(id!),
        ready: () => printJobApi.markReady(id!),
      };
      return actions[action]();
    },
    onSuccess: (response: any, variables) => {
      qc.invalidateQueries({ queryKey: ['vendorJob', id] });
      qc.invalidateQueries({ queryKey: ['vendorQueue'] });
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });

      if (variables.action === 'start') {
        const docUrl = response?.data?.data?.documentUrl || targetFileUrl;
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

  const handleStartPrinting = () => {
    // Open a blank tab synchronously within user gesture to prevent popup blockers
    const printWindow = window.open('about:blank', '_blank');
    actionMutation.mutate({ action: 'start', printWindow });
  };

  const collectMutation = useMutation({
    mutationFn: (token: string) => printJobApi.collect(id!, token),
    onSuccess: () => {
      toast.success('Pickup confirmed and order completed!');
      setShowHandoverModal(false);
      qc.invalidateQueries({ queryKey: ['vendorJob', id] });
      qc.invalidateQueries({ queryKey: ['vendorQueue'] });
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Invalid token or pickup confirmation failed'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <ErrorState
        message="Print order not found or deleted."
        onRetry={() => qc.invalidateQueries({ queryKey: ['vendorJob', id] })}
      />
    );
  }

  const doc =
    job.documentId && typeof job.documentId === 'object'
      ? (job.documentId as { originalName: string; pageCount: number; fileSize?: number; fileUrl?: string })
      : null;
  const studentObj =
    typeof job.studentId === 'object'
      ? (job.studentId as { name?: string; phone?: string; enrollmentNumber?: string })
      : null;

  const customerName = job.customerName || studentObj?.name || 'Walk-in Student';
  const customerPhone = job.customerPhone || studentObj?.phone;
  const customerIdentifier =
    job.customerIdentifier || studentObj?.enrollmentNumber || customerPhone || '';
  const isCompleted = job.status === 'COLLECTED';
  const rawTargetUrl =
    !isCompleted
      ? (documentUrl || doc?.fileUrl || (job?._id ? `/api/print-jobs/${job._id}/file` : undefined))
      : undefined;

  const backendHost =
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.PROD ? 'https://campusprint-3agy.onrender.com' : '');

  const targetFileUrl =
    rawTargetUrl && !rawTargetUrl.startsWith('http') && !rawTargetUrl.startsWith('//')
      ? `${backendHost}${rawTargetUrl}`
      : rawTargetUrl;

  return (
    <ErrorBoundary fallbackTitle="Could not display order details">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in text-left pb-12">
      {/* ─── Back Navigation ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/vendor/queue')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Print Queue</span>
      </button>

      {/* ─── Top Token Card ─────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pickup Number
          </span>
          <div className="text-4xl font-extrabold text-blue-600 font-mono tracking-wider mt-1">
            {job.publicToken}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Clock size={13} />
            <span>Ordered on {new Date(job.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <StatusBadge status={job.status} />
          <div className="text-xs font-medium text-slate-500">
            Payment Status: <span className="font-semibold text-emerald-600">PAID</span>
          </div>
        </div>
      </div>

      {/* ─── Customer Details Card ───────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Student Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <UserIcon size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Customer Name</div>
              <div className="text-sm font-bold text-slate-900">{customerName}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Hash size={16} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Enrollment / Mobile</div>
              <div className="text-sm font-bold font-mono text-slate-900">
                {customerIdentifier || '—'}
              </div>
            </div>
          </div>

          {customerPhone && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 sm:col-span-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Phone size={16} />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Direct Phone Number</div>
                <a
                  href={`tel:${customerPhone}`}
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  {customerPhone}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Document & Download File Card ───────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Document to Print
        </h2>

        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">
                {doc?.originalName || 'Document.pdf'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{job.printConfig?.totalPages || doc?.pageCount || 1} pages</span>
                <span>·</span>
                <span>
                  {job.printConfig?.pageRanges === 'all'
                    ? 'All pages'
                    : `Pages: ${job.printConfig?.pageRanges}`}
                </span>
                {(job.isCustomPdf || (job.printConfig?.pageRanges && job.printConfig.pageRanges !== 'all')) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ⚡ Updated Custom PDF
                  </span>
                )}
              </div>
            </div>
          </div>

          {isCompleted ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold border border-slate-200 flex-shrink-0">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>PDF deleted after pickup</span>
            </div>
          ) : targetFileUrl ? (
            <a
              href={targetFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex-shrink-0"
            >
              <Download size={15} />
              <span>Open / Download PDF</span>
              <ExternalLink size={13} />
            </a>
          ) : null}
        </div>

        {(job.isCustomPdf || (job.printConfig?.pageRanges && job.printConfig.pageRanges !== 'all')) && !isCompleted && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <span className="text-base">📄</span>
            <span>
              <strong>Ready to print directly:</strong> This PDF contains only the student's selected pages ({job.printConfig?.pageRanges}). No need to configure page ranges on your printer.
            </span>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
            <span>Document file was permanently deleted from cloud storage upon verified handover for privacy.</span>
          </div>
        )}
      </div>

      {/* ─── Print Specifications & Pricing ──────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Print Specifications
        </h2>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-500">Color Mode</span>
            <span className="font-bold text-slate-900">
              {job.printConfig?.colorMode === 'BW' ? 'Black & White' : 'Color'}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-500">Page Layout</span>
            <span className="font-bold text-slate-900">
              {job.printConfig?.sides === 'DOUBLE' ? 'Double-sided (Duplex)' : 'Single-sided'}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-500">Copies</span>
            <span className="font-bold text-slate-900">{job.printConfig?.copies || 1} copies</span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-500">Pages per Copy</span>
            <span className="font-bold text-slate-900">
              {job.printConfig?.totalPages || 1} pages
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-500">Total Print Sheets</span>
            <span className="font-bold text-slate-900">
              {job.printConfig?.sides === 'DOUBLE'
                ? Math.ceil((job.printConfig?.totalPages || 1) / 2) * (job.printConfig?.copies || 1)
                : (job.printConfig?.totalPages || 1) * (job.printConfig?.copies || 1)}{' '}
              sheets
            </span>
          </div>

          <div className="py-3 flex justify-between items-center text-sm font-bold text-slate-900 pt-3">
            <span>Total Order Paid</span>
            <span className="text-blue-600 text-base">₹{job.pricing?.total ?? 0}</span>
          </div>
        </div>
      </div>

      {/* ─── Workflow Processing Action Bar ──────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Process Print Order
        </h2>

        <div className="flex flex-wrap gap-3">
          {job.status === 'QUEUED' && (
            <button
              type="button"
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate({ action: 'accept' })}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Accept Print Job
            </button>
          )}

          {job.status === 'ACCEPTED' && (
            <button
              type="button"
              disabled={actionMutation.isPending}
              onClick={() => handleStartPrinting()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              <Printer size={15} />
              <span>Start Printing Now</span>
            </button>
          )}

          {job.status === 'PRINTING' && (
            <button
              type="button"
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate({ action: 'ready' })}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              <CheckCircle2 size={15} />
              <span>Mark Ready for Pickup</span>
            </button>
          )}

          {job.status === 'READY' && (
            <button
              type="button"
              onClick={() => setShowHandoverModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              <CheckCircle2 size={15} />
              <span>Verify & Complete Handover</span>
            </button>
          )}

          {job.status === 'COLLECTED' && (
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
              <CheckCircle2 size={18} />
              <span>Order Handed Over & Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Handover Confirmation Modal ─────────────────────────────────────── */}
      {showHandoverModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowHandoverModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-left relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHandoverModal(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-900">Confirm Order Handover</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ask student for their token number (e.g. <strong className="font-mono text-blue-600">{job.publicToken}</strong>).
            </p>

            <div className="mt-4 space-y-4">
              <input
                type="text"
                inputMode="numeric"
                placeholder={`Enter ${job.publicToken}`}
                value={pickupTokenInput}
                onChange={(e) => setPickupTokenInput(e.target.value.trim())}
                className="w-full text-center text-3xl font-extrabold tracking-widest font-mono py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!pickupTokenInput || collectMutation.isPending}
                  onClick={() => collectMutation.mutate(pickupTokenInput)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  {collectMutation.isPending ? <Spinner size="sm" /> : 'Confirm Handover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

export default VendorOrderDetailPage;
