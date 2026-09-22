import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, CreditCard, Loader2, Clock, Users, CheckCircle2, Sparkles } from 'lucide-react';
import { printJobApi } from '../../api/printJobApi';
import { paymentApi } from '../../api/paymentApi';
import { StatusBadge, Spinner, ErrorState, TokenDisplay } from '../../components/ui';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'sonner';
import type { PrintJob, PrintJobStatus } from '../../types';

const STATUS_STEPS: PrintJobStatus[] = ['PAYMENT_PENDING', 'QUEUED', 'ACCEPTED', 'PRINTING', 'READY', 'COLLECTED'];

const STEP_LABELS: Record<string, string> = {
  PAYMENT_PENDING: 'Payment',
  QUEUED: 'Submitted',
  ACCEPTED: 'Accepted',
  PRINTING: 'Printing',
  READY: 'Ready',
  COLLECTED: 'Collected',
};

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { socket } = useSocket();

  const { data, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => printJobApi.getById(id!).then(r => r.data.data),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const job: PrintJob | undefined = data?.job;

  // Queue position — poll every 30s while in active states
  const activeStatuses = ['QUEUED', 'ACCEPTED', 'PRINTING'];
  const isActive = job && activeStatuses.includes(job.status);

  const { data: queueData, refetch: refetchQueue } = useQuery({
    queryKey: ['queuePosition', id],
    queryFn: () => printJobApi.getQueuePosition(id!).then(r => r.data.data),
    enabled: !!id && !!isActive,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const [isPayingNow, setIsPayingNow] = useState(false);

  // Live updates — refetch job and queue position on any update
  useEffect(() => {
    if (!socket) return;

    const handleJobUpdate = () => {
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['queuePosition', id] });
    };

    // queue:updated fires whenever any job at the same vendor changes status
    const handleQueueUpdate = () => {
      refetchQueue();
    };

    socket.on('printJob:updated', handleJobUpdate);
    socket.on('queue:updated', handleQueueUpdate);

    return () => {
      socket.off('printJob:updated', handleJobUpdate);
      socket.off('queue:updated', handleQueueUpdate);
    };
  }, [socket, id, qc, refetchQueue]);

  const loadCashfreeSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Cashfree) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
      document.head.appendChild(script);
    });
  };

  const handlePayNow = useCallback(async () => {
    if (!job?._id) return;
    setIsPayingNow(true);
    try {
      const orderRes = await paymentApi.createOrder(job._id, true);
      const { paymentSessionId } = orderRes.data.data;
      if (!paymentSessionId) throw new Error('No payment session');
      await loadCashfreeSDK();
      const cashfreeMode = (import.meta.env.VITE_CASHFREE_ENV ?? 'sandbox').toLowerCase();
      const cashfree = (window as any).Cashfree({ mode: cashfreeMode });
      cashfree.checkout({ paymentSessionId, redirectTarget: '_self' }).then((result: any) => {
        if (result?.error) {
          console.error('[Cashfree Checkout Error]', result.error);
          toast.error(result.error.message || 'Payment could not be completed. Please try again.');
          setIsPayingNow(false);
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setIsPayingNow(false);
    }
  }, [job?._id]);

  const handleSimulatePayment = useCallback(async () => {
    if (!job?._id) return;
    setIsPayingNow(true);
    try {
      await paymentApi.simulateSuccess(job._id);
      toast.success('Payment simulated successfully! Order moved to queue.');
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['queuePosition', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Simulation failed');
    } finally {
      setIsPayingNow(false);
    }
  }, [job?._id, id, qc]);

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size="lg" /></div>;
  if (error || !job) return <ErrorState message="Order not found." onRetry={() => qc.invalidateQueries({ queryKey: ['job', id] })} />;

  const doc = typeof job.documentId === 'object' ? (job.documentId as { originalName: string; pageCount: number; fileSize: number }) : null;
  const vendor = typeof job.vendorId === 'object' ? (job.vendorId as { shopName: string; address: string; phone: string }) : null;

  const currentStepIdx = STATUS_STEPS.indexOf(job.status);
  const isCancelled = job.status === 'CANCELLED';
  const isReady = job.status === 'READY';
  const isPaymentPending = job.status === 'PAYMENT_PENDING';
  const isCollected = job.status === 'COLLECTED';

  const qp = queueData;

  return (
    <div className="cp-page animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Back */}
      <button className="cp-btn cp-btn-ghost cp-btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Payment Pending CTA */}
      {isPaymentPending && (
        <div
          style={{
            background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
            border: '1px solid #A5B4FC',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💳</div>
          <h3 style={{ margin: '0 0 0.4rem', fontWeight: 700, color: '#3730A3' }}>Payment Required</h3>
          <p style={{ margin: '0 0 1rem', color: '#4338CA', fontSize: '0.85rem' }}>
            Complete your UPI payment to send this job to the vendor's queue.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
            <button
              id="pay-now-order-detail-btn"
              onClick={handlePayNow}
              disabled={isPayingNow}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                background: '#4F46E5', color: 'white',
                border: 'none', borderRadius: '0.75rem',
                fontWeight: 700, fontSize: '0.95rem',
                cursor: isPayingNow ? 'not-allowed' : 'pointer',
                opacity: isPayingNow ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
              }}
            >
              {isPayingNow ? (
                <><Loader2 size={18} className="animate-spin" /><span>Preparing payment...</span></>
              ) : (
                <><CreditCard size={18} /><span>Pay ₹{job.pricing.total} with UPI</span></>
              )}
            </button>

            <button
              type="button"
              id="simulate-payment-btn"
              onClick={handleSimulatePayment}
              disabled={isPayingNow}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.45rem 1rem',
                background: '#EEF2FF', color: '#4338CA',
                border: '1px dashed #6366F1', borderRadius: '0.5rem',
                fontWeight: 600, fontSize: '0.8rem',
                cursor: isPayingNow ? 'not-allowed' : 'pointer',
              }}
            >
              <span>⚡ Simulate Success (Sandbox / Dev)</span>
            </button>
          </div>
        </div>
      )}

      {/* Header — Token + Status */}
      <div
        className="cp-card"
        style={{
          background: isReady
            ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))'
            : isCollected
            ? 'linear-gradient(135deg, rgba(100,116,139,0.08), rgba(100,116,139,0.02))'
            : 'var(--gradient-card)',
          border: isReady
            ? '1px solid rgba(16,185,129,0.3)'
            : 'border: 1px solid var(--surface-border)',
          marginBottom: '1rem',
          textAlign: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        {isReady && <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✨</div>}
        {isCollected && <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>}

        <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
          {isReady ? 'Ready for Pickup!' : isCollected ? 'Collected — All Done!' : 'Your Pickup Token'}
        </p>

        {/* Big token display — student tells this number verbally to vendor */}
        <div style={{ marginBottom: '0.75rem' }}>
          <TokenDisplay token={job.publicToken} large />
        </div>

        <StatusBadge status={job.status} />

        {isReady && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              background: 'rgba(16,185,129,0.08)',
              borderRadius: '0.75rem',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <p style={{ color: '#065f46', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.35rem' }}>
              🎉 Your prints are ready!
            </p>
            <p style={{ color: '#047857', fontSize: '0.82rem', margin: 0 }}>
              Tell the vendor your token number <strong>{job.publicToken}</strong> to collect your prints.
            </p>
          </div>
        )}
      </div>

      {/* ─── Real-time Queue Position ────────────────────────────────────────── */}
      {isActive && qp && (
        <div
          className="cp-card"
          style={{
            marginBottom: '1rem',
            padding: '1.25rem',
            background: qp.position === 1
              ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)'
              : 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
            border: qp.position === 1
              ? '1px solid rgba(16,185,129,0.3)'
              : '1px solid rgba(59,130,246,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: qp.position === 1 ? '#10B981' : '#3B82F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {qp.position === 1
                ? <Sparkles size={22} color="white" />
                : <Users size={22} color="white" />
              }
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
                {qp.position === 1 ? '🎉 You\'re next!' : `Queue Position #${qp.position}`}
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                {qp.message}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <div
              style={{
                flex: 1, textAlign: 'center', padding: '0.6rem',
                background: 'rgba(255,255,255,0.7)', borderRadius: '0.6rem',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E40AF' }}>{qp.jobsAhead}</div>
              <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Jobs ahead</div>
            </div>
            <div
              style={{
                flex: 1, textAlign: 'center', padding: '0.6rem',
                background: 'rgba(255,255,255,0.7)', borderRadius: '0.6rem',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <Clock size={14} color="#1E40AF" />
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E40AF' }}>
                  ~{qp.estimatedMinutes || '<3'}
                </span>
              </div>
              <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Est. minutes</div>
            </div>
            <div
              style={{
                flex: 1, textAlign: 'center', padding: '0.6rem',
                background: 'rgba(255,255,255,0.7)', borderRadius: '0.6rem',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={14} color={job.status === 'PRINTING' ? '#10B981' : '#94A3B8'} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF', textTransform: 'capitalize' }}>
                  {job.status.toLowerCase()}
                </span>
              </div>
              <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Status</div>
            </div>
          </div>

          <p style={{ margin: '0.75rem 0 0', fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center' }}>
            Updates automatically when vendor processes orders
          </p>
        </div>
      )}

      {/* Status timeline */}
      {!isCancelled && (
        <div className="cp-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600 }}>Order Progress</h3>
          <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
            {STATUS_STEPS.map((step, idx) => {
              const done = idx < currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {idx > 0 && (
                    <div
                      style={{
                        position: 'absolute', left: '-50%', right: '50%', top: 10, height: 2,
                        background: done || active ? 'var(--gradient-brand)' : 'var(--surface-border)',
                        transition: 'background 0.4s',
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: done ? 'var(--gradient-brand)' : active ? 'var(--brand-500)' : 'var(--surface-raised)',
                      border: active ? '2px solid var(--brand-400)' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', color: 'white',
                      boxShadow: active ? '0 0 10px rgba(99,102,241,0.5)' : 'none',
                      transition: 'all 0.4s',
                      position: 'relative', zIndex: 1,
                    }}
                  >
                    {done ? '✓' : active ? '●' : '○'}
                  </div>
                  <span
                    style={{
                      fontSize: '0.6rem', marginTop: '0.35rem',
                      color: done || active ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: active ? 700 : 400,
                      textAlign: 'center',
                    }}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="cp-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600 }}>Print Details</h3>
        {[
          { label: 'Document', value: doc?.originalName ?? 'N/A' },
          {
            label: 'Pages',
            value:
              job.printConfig.pageRanges !== 'all'
                ? `${job.printConfig.totalPages} pages (custom: ${job.printConfig.pageRanges})`
                : `${job.printConfig.totalPages} pages (All)`,
          },
          { label: 'Copies', value: job.printConfig.copies },
          { label: 'Color', value: job.printConfig.colorMode === 'BW' ? 'Black & White' : 'Color' },
          { label: 'Sides', value: job.printConfig.sides === 'SINGLE' ? 'Single-sided' : 'Double-sided' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--surface-border)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.label}</span>
            <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="cp-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600 }}>Price Breakdown</h3>
        {[
          { label: 'Print charges', value: job.pricing.subtotal },
          { label: 'Platform fee', value: job.pricing.platformFee },
          { label: 'Tax', value: job.pricing.tax },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.label}</span>
            <span style={{ fontSize: '0.85rem' }}>₹{item.value}</span>
          </div>
        ))}
        <div className="cp-divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem' }}>
          <span>Total</span>
          <span style={{ color: 'var(--brand-400)' }}>₹{job.pricing.total}</span>
        </div>
      </div>

      {/* Vendor */}
      {vendor && (
        <div className="cp-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>Vendor</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{vendor.shopName}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{vendor.address}</div>
            </div>
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="cp-btn cp-btn-secondary cp-btn-sm">
                <Phone size={14} /> Call
              </a>
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="cp-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>Timeline</h3>
        {[
          { label: 'Ordered', ts: job.createdAt },
          { label: 'Accepted', ts: job.acceptedAt },
          { label: 'Printing started', ts: job.printingStartedAt },
          { label: 'Ready', ts: job.readyAt },
          { label: 'Collected', ts: job.collectedAt },
          { label: 'Cancelled', ts: job.cancelledAt },
        ].filter(t => t.ts).map(t => (
          <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
            <span>{new Date(t.ts!).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderDetailPage;
