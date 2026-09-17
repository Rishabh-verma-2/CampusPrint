import React from 'react';
import {
  Clock,
  CheckCircle2,
  Printer,
  XCircle,
  AlertTriangle,
  RotateCcw,
  CreditCard,
  Check,
} from 'lucide-react';
import type { PrintJobStatus, VendorAvailability, VendorStatus } from '../../types';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PrintJobStatus, string> = {
  PAYMENT_PENDING: 'Payment Pending',
  PAID: 'Paid',
  QUEUED: 'In Queue',
  ACCEPTED: 'Accepted',
  PRINTING: 'Printing',
  READY: 'Ready for pickup',
  COLLECTED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const renderStatusIcon = (status: PrintJobStatus) => {
  const props = { size: 13, className: 'inline-block flex-shrink-0' };
  switch (status) {
    case 'PAYMENT_PENDING':
      return <CreditCard {...props} />;
    case 'PAID':
      return <Check {...props} />;
    case 'QUEUED':
      return <Clock {...props} />;
    case 'ACCEPTED':
      return <CheckCircle2 {...props} />;
    case 'PRINTING':
      return <Printer {...props} />;
    case 'READY':
      return <CheckCircle2 {...props} />;
    case 'COLLECTED':
      return <CheckCircle2 {...props} />;
    case 'CANCELLED':
      return <XCircle {...props} />;
    case 'FAILED':
      return <AlertTriangle {...props} />;
    case 'REFUNDED':
      return <RotateCcw {...props} />;
    default:
      return null;
  }
};

export const StatusBadge: React.FC<{ status: PrintJobStatus; showIcon?: boolean }> = ({
  status,
  showIcon = true,
}) => {
  const cls = `cp-badge cp-badge-${status.toLowerCase()}`;
  return (
    <span className={cls} role="status" aria-label={STATUS_LABELS[status]}>
      {showIcon && <span className="mr-1 inline-flex items-center" aria-hidden="true">{renderStatusIcon(status)}</span>}
      {STATUS_LABELS[status]}
    </span>
  );
};

// ─── Availability Badge ───────────────────────────────────────────────────────

export const AvailabilityBadge: React.FC<{ availability: VendorAvailability }> = ({
  availability,
}) => {
  const labels = { OPEN: 'Open', CLOSED: 'Closed', UNAVAILABLE: 'Unavailable' };
  const dotColor = {
    OPEN: 'bg-emerald-500',
    CLOSED: 'bg-rose-500',
    UNAVAILABLE: 'bg-amber-500',
  };
  return (
    <span className={`cp-badge cp-badge-${availability.toLowerCase()} inline-flex items-center gap-1.5`}>
      <span className={`w-2 h-2 rounded-full ${dotColor[availability]}`} aria-hidden="true" />
      {labels[availability]}
    </span>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string; style?: React.CSSProperties }> = ({
  size = 'md',
  className = '',
  style,
}) => {
  const sizes = { sm: 16, md: 24, lg: 36 };
  const px = sizes[size];
  return (
    <svg
      className={`animate-spin ${className}`}
      style={style}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style,
}) => <div className={`cp-skeleton ${className}`} style={style} aria-hidden="true" />;

export const SkeletonCard: React.FC = () => (
  <div className="cp-card">
    <Skeleton style={{ height: 16, width: '60%', marginBottom: 12 }} />
    <Skeleton style={{ height: 12, width: '80%', marginBottom: 8 }} />
    <Skeleton style={{ height: 12, width: '40%' }} />
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div
    style={{
      textAlign: 'center',
      padding: '3rem 1.5rem',
      color: 'var(--text-secondary)',
    }}
  >
    {icon && (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
        {icon}
      </div>
    )}
    <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{title}</h3>
    {description && <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>{description}</p>}
    {action}
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Something went wrong.',
  onRetry,
}) => (
  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--color-warning)' }}>
      <AlertTriangle size={32} />
    </div>
    <p style={{ marginBottom: onRetry ? '1rem' : 0 }}>{message}</p>
    {onRetry && (
      <button className="cp-btn cp-btn-secondary" onClick={onRetry}>
        Try Again
      </button>
    )}
  </div>
);

// ─── Page Header ─────────────────────────────────────────────────────────────

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.75rem',
      marginBottom: '1.5rem',
    }}
  >
    <div>
      <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{title}</h1>
      {subtitle && (
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {subtitle}
        </p>
      )}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ─── Price Display ────────────────────────────────────────────────────────────

export const PriceTag: React.FC<{ amount: number; size?: 'sm' | 'md' | 'lg' }> = ({
  amount,
  size = 'md',
}) => {
  const sizes = { sm: '0.85rem', md: '1rem', lg: '1.4rem' };
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: sizes[size],
        color: 'var(--brand-400)',
      }}
    >
      ₹{amount.toFixed(0)}
    </span>
  );
};

// ─── Token Display ────────────────────────────────────────────────────────────

export const TokenDisplay: React.FC<{ token: string; large?: boolean }> = ({ token, large }) => (
  <div
    style={{
      display: 'inline-block',
      background: 'var(--gradient-brand)',
      padding: large ? '0.6rem 1.5rem' : '0.35rem 0.85rem',
      borderRadius: '10px',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: large ? '1.5rem' : '1rem',
      color: 'white',
      letterSpacing: '0.08em',
    }}
  >
    {token}
  </div>
);

// ─── Confirm Modal ────────────────────────────────────────────────────────────

export const ConfirmModal: React.FC<{
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}> = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger, onConfirm, onCancel, loading }) => (
  <div className="cp-modal-overlay" onClick={onCancel}>
    <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
      <h3 style={{ margin: '0 0 0.75rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{message}</p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button className="cp-btn cp-btn-ghost" onClick={onCancel} disabled={loading}>
          {cancelText}
        </button>
        <button
          className={`cp-btn ${danger ? 'cp-btn-danger' : 'cp-btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
          id="confirm-btn"
        >
          {loading ? <Spinner size="sm" /> : confirmText}
        </button>
      </div>
    </div>
  </div>
);
