import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Phone } from 'lucide-react';
import QRCode from 'react-qr-code';
import { printJobApi } from '../../api/printJobApi';
import { StatusBadge, Spinner, ErrorState, TokenDisplay } from '../../components/ui';
import { useSocket } from '../../context/SocketContext';
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

  // Live updates
  useEffect(() => {
    if (!socket) return;
    socket.on('printJob:updated', () => {
      qc.invalidateQueries({ queryKey: ['job', id] });
    });
    return () => { socket.off('printJob:updated'); };
  }, [socket, id, qc]);

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size="lg" /></div>;
  if (error || !job) return <ErrorState message="Order not found." onRetry={() => qc.invalidateQueries({ queryKey: ['job', id] })} />;

  const doc = typeof job.documentId === 'object' ? (job.documentId as { originalName: string; pageCount: number; fileSize: number }) : null;
  const vendor = typeof job.vendorId === 'object' ? (job.vendorId as { shopName: string; address: string; phone: string }) : null;

  const currentStepIdx = STATUS_STEPS.indexOf(job.status);
  const isCancelled = job.status === 'CANCELLED';
  const isReady = job.status === 'READY';

  return (
    <div className="cp-page animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Back */}
      <button className="cp-btn cp-btn-ghost cp-btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div
        className="cp-card"
        style={{
          background: isReady
            ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))'
            : 'var(--gradient-card)',
          border: isReady ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--surface-border)',
          marginBottom: '1rem',
          textAlign: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        {isReady && <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✨</div>}
        <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
          {isReady ? 'Ready for Pickup!' : 'Print Token'}
        </p>
        <div style={{ marginBottom: '0.75rem' }}>
          <TokenDisplay token={job.publicToken} large />
        </div>
        <StatusBadge status={job.status} />

        {isReady && (
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              Show this QR or token at the shop
            </p>
            <div style={{ display: 'inline-block', background: 'white', padding: '12px', borderRadius: '12px' }}>
              <QRCode value={job.publicToken} size={140} />
            </div>
          </div>
        )}
      </div>

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
          { label: 'Pages', value: `${job.printConfig.totalPages} pages (${job.printConfig.pageRanges})` },
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
