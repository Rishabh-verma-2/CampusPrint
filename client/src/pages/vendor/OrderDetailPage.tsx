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
} from 'lucide-react';
import { printJobApi } from '../../api/printJobApi';
import { StatusBadge, Spinner, ErrorState } from '../../components/ui';
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
    queryFn: () => printJobApi.getById(id!).then(r => r.data.data),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const job: PrintJob | undefined = data?.job;
  const documentUrl: string | undefined = data?.documentUrl;

  const actionMutation = useMutation({
    mutationFn: (action: string) => {
      const actions: Record<string, () => Promise<unknown>> = {
        accept: () => printJobApi.accept(id!),
        start: () => printJobApi.start(id!),
        ready: () => printJobApi.markReady(id!),
      };
      return actions[action]();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendorJob', id] });
      toast.success('Job status updated');
    },
    onError: () => toast.error('Action failed'),
  });

  const collectMutation = useMutation({
    mutationFn: (token: string) => printJobApi.collect(id!, token),
    onSuccess: () => {
      toast.success('Pickup confirmed and completed');
      setShowHandoverModal(false);
      qc.invalidateQueries({ queryKey: ['vendorJob', id] });
    },
    onError: () => toast.error('Invalid token or pickup failed'),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size="lg" /></div>;
  if (error || !job) return <ErrorState message="Order not found." onRetry={() => qc.invalidateQueries({ queryKey: ['vendorJob', id] })} />;

  const doc = typeof job.documentId === 'object' ? (job.documentId as { originalName: string; pageCount: number; fileSize: number; fileUrl?: string }) : null;
  const studentObj = typeof job.studentId === 'object' ? (job.studentId as { name?: string; phone?: string; enrollmentNumber?: string }) : null;

  const customerName = job.customerName || studentObj?.name || 'Walk-in Student';
  const customerIdentifier = job.customerIdentifier || studentObj?.enrollmentNumber || studentObj?.phone || '';
  const customerPhone = job.customerPhone || studentObj?.phone || '';

  return (
    <div className="cp-page animate-fade-in" style={{ maxWidth: 640, margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      {/* Back link */}
      <button
        className="cp-btn cp-btn-ghost cp-btn-sm"
        onClick={() => navigate('/vendor/queue')}
        style={{ marginBottom: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} /> Back to Queue
      </button>

      {/* Header Card */}
      <div className="cp-card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Pickup Number
            </span>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '2.2rem',
                color: 'var(--brand-500)',
                lineHeight: 1.1,
                marginTop: '0.2rem',
              }}
            >
              {job.publicToken}
            </div>
          </div>
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Customer Information Card */}
      <div className="cp-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Customer Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserIcon size={15} className="text-slate-400" /> Name
            </span>
            <span style={{ fontWeight: 600 }}>{customerName}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={15} className="text-slate-400" /> Enrollment / Mobile
            </span>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{customerIdentifier || '—'}</span>
          </div>

          {customerPhone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={15} className="text-slate-400" /> Contact Number
              </span>
              <a href={`tel:${customerPhone}`} style={{ color: 'var(--brand-500)', fontWeight: 600 }}>
                {customerPhone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Print Document & File Card */}
      <div className="cp-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Document to Print
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--surface-raised)', padding: '0.85rem 1rem', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={24} className="text-blue-500" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc?.originalName ?? 'document.pdf'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {job.printConfig.totalPages} total pages · {job.printConfig.pageRanges === 'all' ? 'All pages' : `Pages ${job.printConfig.pageRanges}`}
              </div>
            </div>
          </div>

          {(documentUrl || doc?.fileUrl) && (
            <a
              href={documentUrl || doc?.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cp-btn cp-btn-primary cp-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} />
              <span>Open / Download PDF</span>
            </a>
          )}
        </div>
      </div>

      {/* Print Specifications Card */}
      <div className="cp-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Print Specifications
        </h3>
        {[
          { label: 'Color Mode', value: job.printConfig.colorMode === 'BW' ? 'Black & White' : 'Color' },
          { label: 'Sides', value: job.printConfig.sides === 'DOUBLE' ? 'Double-sided (Duplex)' : 'Single-sided' },
          { label: 'Copies', value: `${job.printConfig.copies} copy(s)` },
          { label: 'Pages per Copy', value: `${job.printConfig.totalPages} pages` },
          { label: 'Total Amount', value: `₹${job.pricing.total}` },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.85rem', borderBottom: '1px solid var(--surface-border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontWeight: 600 }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Workflow Action Bar */}
      <div className="cp-card" style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Process Order
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {job.status === 'QUEUED' && (
            <button
              className="cp-btn cp-btn-primary"
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate('accept')}
            >
              Accept Print Job
            </button>
          )}
          {job.status === 'ACCEPTED' && (
            <button
              className="cp-btn cp-btn-success"
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate('start')}
            >
              Start Printing Now
            </button>
          )}
          {job.status === 'PRINTING' && (
            <button
              className="cp-btn cp-btn-primary"
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate('ready')}
            >
              Mark Order Ready for Pickup
            </button>
          )}
          {job.status === 'READY' && (
            <button
              className="cp-btn cp-btn-success"
              onClick={() => setShowHandoverModal(true)}
            >
              Verify Pickup & Complete Handover
            </button>
          )}
          {job.status === 'COLLECTED' && (
            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} /> Order Collected by Student
            </div>
          )}
        </div>
      </div>

      {/* Handover Modal */}
      {showHandoverModal && (
        <div className="cp-modal-overlay" onClick={() => setShowHandoverModal(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Confirm Handover</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Ask student for their pickup number (should match: <strong>{job.publicToken}</strong>).
            </p>
            <input
              className="cp-input"
              type="text"
              inputMode="numeric"
              placeholder={`Enter number (e.g. ${job.publicToken})`}
              value={pickupTokenInput}
              onChange={e => setPickupTokenInput(e.target.value.trim())}
              style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 700, textAlign: 'center' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="cp-btn cp-btn-ghost" style={{ flex: 1 }} onClick={() => setShowHandoverModal(false)}>
                Cancel
              </button>
              <button
                className="cp-btn cp-btn-success"
                style={{ flex: 1 }}
                disabled={!pickupTokenInput || collectMutation.isPending}
                onClick={() => collectMutation.mutate(pickupTokenInput)}
              >
                {collectMutation.isPending ? <Spinner size="sm" /> : 'Confirm Handover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOrderDetailPage;
