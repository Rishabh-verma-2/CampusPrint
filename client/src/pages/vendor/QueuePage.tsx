import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle2, Check, ArrowRight, User as UserIcon, Hash, FileText, Printer, Clock } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { printJobApi } from '../../api/printJobApi';
import { StatusBadge, Spinner, EmptyState, PageHeader, ErrorState } from '../../components/ui';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'sonner';
import type { PrintJob } from '../../types';

const QUEUE_TABS = [
  { key: 'all', label: 'Active', statuses: ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY'] },
  { key: 'new', label: 'New', statuses: ['QUEUED'] },
  { key: 'printing', label: 'Printing', statuses: ['ACCEPTED', 'PRINTING'] },
  { key: 'ready', label: 'Ready', statuses: ['READY'] },
  { key: 'completed', label: 'Done', statuses: ['COLLECTED'] },
];

const VendorQueuePage: React.FC = () => {
  const [tab, setTab] = React.useState('all');
  const [pickupModal, setPickupModal] = React.useState(false);
  const [pickupToken, setPickupToken] = React.useState('');
  const [verifyResult, setVerifyResult] = React.useState<{ job: PrintJob } | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { socket } = useSocket();

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendorQueue', tab],
    queryFn: () => vendorApi.getQueue({ status: tab, limit: 50 }).then(r => r.data.data),
    refetchInterval: 20000,
  });

  const jobs: PrintJob[] = data?.jobs ?? [];

  // Real-time updates
  React.useEffect(() => {
    if (!socket) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['vendorQueue'] });
    socket.on('printJob:new', refresh);
    socket.on('printJob:updated', refresh);
    return () => { socket.off('printJob:new', refresh); socket.off('printJob:updated', refresh); };
  }, [socket, qc]);

  const actionMutation = useMutation({
    mutationFn: ({ action, id }: { action: string; id: string }) => {
      const actions: Record<string, (id: string) => Promise<unknown>> = {
        accept: printJobApi.accept,
        start: printJobApi.start,
        ready: printJobApi.markReady,
      };
      return actions[action](id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendorQueue'] }); toast.success('Status updated'); },
    onError: () => toast.error('Action failed'),
  });

  const verifyMutation = useMutation({
    mutationFn: (token: string) => printJobApi.verifyToken(token).then(r => r.data.data),
    onSuccess: (data) => setVerifyResult(data as { job: PrintJob }),
    onError: () => toast.error('Invalid token or job not ready'),
  });

  const collectMutation = useMutation({
    mutationFn: ({ id, token }: { id: string; token: string }) => printJobApi.collect(id, token),
    onSuccess: () => {
      toast.success('Pickup confirmed');
      setPickupModal(false);
      setVerifyResult(null);
      setPickupToken('');
      qc.invalidateQueries({ queryKey: ['vendorQueue'] });
    },
    onError: () => toast.error('Collect failed'),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size="lg" /></div>;
  if (error) return <ErrorState onRetry={() => qc.invalidateQueries({ queryKey: ['vendorQueue'] })} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Print Queue"
        subtitle={`${jobs.length} active jobs`}
        action={
          <button className="cp-btn cp-btn-primary" onClick={() => setPickupModal(true)} id="verify-pickup-btn">
            <Search size={15} />
            <span>Verify Pickup</span>
          </button>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {QUEUE_TABS.map(t => (
          <button
            key={t.key}
            className={`cp-btn cp-btn-sm ${tab === t.key ? 'cp-btn-primary' : 'cp-btn-secondary'}`}
            onClick={() => setTab(t.key)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No jobs in this queue" description="New student orders will appear here automatically." />
      ) : (
        <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {jobs.map(job => {
            const doc = typeof job.documentId === 'object' ? (job.documentId as { originalName: string; pageCount: number }) : null;
            const studentObj = typeof job.studentId === 'object' ? (job.studentId as { name?: string; phone?: string; enrollmentNumber?: string }) : null;
            const customerName = job.customerName || studentObj?.name || 'Student';
            const customerIdentifier = job.customerIdentifier || studentObj?.enrollmentNumber || studentObj?.phone || '';

            return (
              <div
                key={job._id}
                className="cp-card"
                style={{
                  border: job.status === 'QUEUED' ? '1px solid rgba(99,102,241,0.3)' :
                    job.status === 'READY' ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--surface-border)',
                  background: job.status === 'READY' ? 'linear-gradient(135deg, rgba(16,185,129,0.06), transparent)' : undefined,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                  <div>
                    {/* Pure numeric token */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0.25rem 0.65rem', borderRadius: '8px',
                          background: 'var(--gradient-brand)', color: 'white',
                          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.05em',
                        }}
                      >
                        {job.publicToken}
                      </span>
                    </div>

                    {/* Student Identification */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <UserIcon size={14} className="text-slate-400" />
                        {customerName}
                      </span>
                      {customerIdentifier && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Hash size={13} className="text-slate-400" />
                          {customerIdentifier}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                {/* Details */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span>{doc?.pageCount ?? '?'} pages</span>
                  <span>{job.printConfig.colorMode === 'BW' ? 'B&W' : 'Color'}</span>
                  <span>{job.printConfig.sides === 'DOUBLE' ? 'Double-sided' : 'Single-sided'}</span>
                  <span>× {job.printConfig.copies}</span>
                  <span style={{ color: 'var(--brand-500)', fontWeight: 700 }}>₹{job.pricing.total}</span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FileText size={13} />
                  <span>{doc?.originalName ?? 'document.pdf'}</span>
                  <span>·</span>
                  <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {job.status === 'QUEUED' && (
                    <button
                      className="cp-btn cp-btn-primary cp-btn-sm"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ action: 'accept', id: job._id })}
                      id={`accept-${job._id}`}
                    >
                      Accept
                    </button>
                  )}
                  {job.status === 'ACCEPTED' && (
                    <button
                      className="cp-btn cp-btn-success cp-btn-sm"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ action: 'start', id: job._id })}
                      id={`start-${job._id}`}
                    >
                      Start Printing
                    </button>
                  )}
                  {job.status === 'PRINTING' && (
                    <button
                      className="cp-btn cp-btn-primary cp-btn-sm"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ action: 'ready', id: job._id })}
                      id={`ready-${job._id}`}
                    >
                      <Check size={14} /> Mark Ready
                    </button>
                  )}
                  {job.status === 'READY' && (
                    <button
                      className="cp-btn cp-btn-success cp-btn-sm"
                      onClick={() => { setPickupToken(job.publicToken); setPickupModal(true); }}
                      id={`collect-${job._id}`}
                    >
                      Verify Pickup
                    </button>
                  )}
                  <button
                    className="cp-btn cp-btn-ghost cp-btn-sm"
                    onClick={() => navigate(`/vendor/orders/${job._id}`)}
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pickup Verification Modal */}
      {pickupModal && (
        <div className="cp-modal-overlay" onClick={() => { setPickupModal(false); setVerifyResult(null); setPickupToken(''); }}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Verify Pickup Number</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Enter the student's pickup number to verify order handover.
            </p>

            {!verifyResult ? (
              <>
                <input
                  className="cp-input"
                  placeholder="e.g. 1048"
                  type="text"
                  inputMode="numeric"
                  value={pickupToken}
                  onChange={e => setPickupToken(e.target.value.trim())}
                  onKeyDown={e => e.key === 'Enter' && verifyMutation.mutate(pickupToken)}
                  style={{ marginBottom: '1rem', fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textAlign: 'center' }}
                  id="pickup-token-input"
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="cp-btn cp-btn-ghost" style={{ flex: 1 }} onClick={() => { setPickupModal(false); setPickupToken(''); }}>
                    Cancel
                  </button>
                  <button
                    className="cp-btn cp-btn-primary"
                    style={{ flex: 1 }}
                    disabled={!pickupToken || verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(pickupToken)}
                    id="verify-token-btn"
                  >
                    {verifyMutation.isPending ? <Spinner size="sm" /> : 'Verify Number'}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ color: '#10b981', fontWeight: 600, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={16} /> Valid Print Job Ready for Pickup
                  </div>
                  {[
                    { l: 'Pickup Number', v: verifyResult.job.publicToken },
                    { l: 'Customer Name', v: verifyResult.job.customerName || (typeof verifyResult.job.studentId === 'object' ? (verifyResult.job.studentId as { name?: string }).name : 'Student') },
                    { l: 'Enrollment / Mobile', v: verifyResult.job.customerIdentifier || (typeof verifyResult.job.studentId === 'object' ? ((verifyResult.job.studentId as { enrollmentNumber?: string }).enrollmentNumber || (verifyResult.job.studentId as { phone?: string }).phone) : '—') },
                    { l: 'Total Pages', v: `${verifyResult.job.printConfig.totalPages}` },
                    { l: 'Print Type', v: verifyResult.job.printConfig.colorMode === 'BW' ? 'Black & White' : 'Color' },
                    { l: 'Sides', v: verifyResult.job.printConfig.sides === 'DOUBLE' ? 'Double-sided' : 'Single-sided' },
                  ].map(item => (
                    <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.l}</span>
                      <span style={{ fontWeight: 600 }}>{item.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="cp-btn cp-btn-ghost" style={{ flex: 1 }} onClick={() => { setVerifyResult(null); setPickupToken(''); }}>
                    Back
                  </button>
                  <button
                    className="cp-btn cp-btn-success"
                    style={{ flex: 1 }}
                    disabled={collectMutation.isPending}
                    onClick={() => collectMutation.mutate({ id: verifyResult.job._id, token: pickupToken })}
                    id="confirm-handover-btn"
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

