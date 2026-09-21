import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';

type VerifyState = 'loading' | 'success' | 'failed' | 'pending' | 'dropped' | 'error';

interface PaymentResult {
  status: string;
  amount: number;
  paidAt?: string;
  printJob: {
    _id: string;
    publicToken: string;
    status: string;
  } | null;
}

const PaymentReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [verifyState, setVerifyState] = useState<VerifyState>('loading');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [retries, setRetries] = useState(0);

  const orderId = searchParams.get('order_id');

  const verifyPayment = async () => {
    if (!orderId) {
      setVerifyState('error');
      return;
    }

    setVerifyState('loading');
    try {
      const res = await paymentApi.getStatus(orderId);
      const { payment, printJob } = res.data.data;

      setResult({
        status: payment.status,
        amount: payment.amount,
        paidAt: payment.paidAt,
        printJob,
      });

      switch (payment.status) {
        case 'SUCCESS':
          setVerifyState('success');
          break;
        case 'FAILED':
          setVerifyState('failed');
          break;
        case 'USER_DROPPED':
        case 'CANCELLED':
          setVerifyState('dropped');
          break;
        case 'PENDING':
        case 'CREATED':
          // Cashfree sometimes takes a moment — poll up to 3 times
          if (retries < 3) {
            setRetries((r) => r + 1);
            setTimeout(verifyPayment, 3000);
          } else {
            setVerifyState('pending');
          }
          break;
        default:
          setVerifyState('pending');
      }
    } catch {
      setVerifyState('error');
    }
  };

  useEffect(() => {
    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // ─── States ───────────────────────────────────────────────────────────────────

  if (verifyState === 'loading') {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={styles.iconWrap('#EEF2FF')}>
            <Loader2 size={36} color="#6366F1" className="animate-spin" />
          </div>
          <h1 style={styles.title}>Verifying Payment...</h1>
          <p style={styles.subtitle}>
            Please wait while we confirm your payment with the payment gateway.
          </p>
          <p style={{ ...styles.subtitle, marginTop: 4, fontSize: '0.75rem', color: '#9CA3AF' }}>
            Do not close this page.
          </p>
        </div>
      </div>
    );
  }

  if (verifyState === 'success' && result) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={styles.iconWrap('#DCFCE7')}>
            <CheckCircle2 size={40} color="#16A34A" />
          </div>
          <h1 style={{ ...styles.title, color: '#15803D' }}>Payment Successful! 🎉</h1>
          <p style={styles.subtitle}>
            Your payment of <strong>₹{result.amount}</strong> was confirmed.
            Your print job has been sent to the store's queue.
          </p>

          {result.printJob && (
            <div style={styles.tokenBox}>
              <span style={styles.tokenLabel}>Your Pickup Token</span>
              <span style={styles.token}>{result.printJob.publicToken}</span>
              <span style={styles.tokenHint}>Tell this token number to the vendor to collect your prints</span>
            </div>
          )}

          {result.paidAt && (
            <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '0.5rem' }}>
              Paid at: {new Date(result.paidAt).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}

          <div style={styles.actions}>
            {result.printJob && (
              <button
                id="view-order-btn"
                onClick={() => navigate(`/student/orders/${result.printJob!._id}`)}
                style={styles.primaryBtn}
              >
                <span>Track Print Job</span>
                <ArrowRight size={16} />
              </button>
            )}
            <button
              id="dashboard-btn"
              onClick={() => navigate('/student')}
              style={styles.secondaryBtn}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (verifyState === 'failed') {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={styles.iconWrap('#FEE2E2')}>
            <XCircle size={40} color="#DC2626" />
          </div>
          <h1 style={{ ...styles.title, color: '#DC2626' }}>Payment Failed</h1>
          <p style={styles.subtitle}>
            Your payment could not be processed. No amount has been deducted.
          </p>
          <div style={styles.actions}>
            <button
              id="retry-payment-btn"
              onClick={() => navigate(-1)}
              style={styles.primaryBtn}
            >
              Try Again
            </button>
            <button
              id="failed-dashboard-btn"
              onClick={() => navigate('/student')}
              style={styles.secondaryBtn}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (verifyState === 'dropped') {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={styles.iconWrap('#FEF3C7')}>
            <AlertCircle size={40} color="#D97706" />
          </div>
          <h1 style={{ ...styles.title, color: '#B45309' }}>Payment Not Completed</h1>
          <p style={styles.subtitle}>
            You closed or cancelled the payment. No amount has been deducted.
            You can try paying again from your order.
          </p>
          <div style={styles.actions}>
            {result?.printJob && (
              <button
                id="retry-dropped-btn"
                onClick={() => navigate(`/student/orders/${result.printJob!._id}`)}
                style={styles.primaryBtn}
              >
                View Order & Retry
              </button>
            )}
            <button
              id="dropped-dashboard-btn"
              onClick={() => navigate('/student')}
              style={styles.secondaryBtn}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (verifyState === 'pending') {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={styles.iconWrap('#EFF6FF')}>
            <Clock size={40} color="#2563EB" />
          </div>
          <h1 style={{ ...styles.title, color: '#1D4ED8' }}>Payment Pending</h1>
          <p style={styles.subtitle}>
            Your payment is being processed. This can take a few minutes.
            You will receive a notification once confirmed.
          </p>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
            Order ID: <code style={{ fontFamily: 'monospace' }}>{orderId}</code>
          </p>
          <div style={styles.actions}>
            <button
              id="check-again-btn"
              onClick={() => { setRetries(0); verifyPayment(); }}
              style={styles.primaryBtn}
            >
              <RefreshCw size={15} />
              <span>Check Again</span>
            </button>
            <button
              id="pending-dashboard-btn"
              onClick={() => navigate('/student')}
              style={styles.secondaryBtn}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        <div style={styles.iconWrap('#FEE2E2')}>
          <AlertCircle size={40} color="#DC2626" />
        </div>
        <h1 style={{ ...styles.title, color: '#DC2626' }}>Verification Error</h1>
        <p style={styles.subtitle}>
          We could not verify your payment status.
          Please check your orders page or contact support if you were charged.
        </p>
        {!orderId && (
          <p style={{ fontSize: '0.8rem', color: '#EF4444', marginTop: '0.5rem' }}>
            Missing order ID in URL.
          </p>
        )}
        <div style={styles.actions}>
          <button
            id="orders-page-btn"
            onClick={() => navigate('/student/orders')}
            style={styles.primaryBtn}
          >
            View My Orders
          </button>
          <button
            id="error-dashboard-btn"
            onClick={() => navigate('/student')}
            style={styles.secondaryBtn}
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Inline Styles ─────────────────────────────────────────────────────────────

const styles = {
  pageWrapper: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'var(--bg-base, #F8FAFC)',
  } as React.CSSProperties,

  card: {
    background: 'white',
    borderRadius: '1.5rem',
    border: '1px solid #E2E8F0',
    padding: '2.5rem 2rem',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center' as const,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
  },

  iconWrap: (bg: string) => ({
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  } as React.CSSProperties),

  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
    lineHeight: 1.3,
  } as React.CSSProperties,

  subtitle: {
    fontSize: '0.9rem',
    color: '#64748B',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: '340px',
  } as React.CSSProperties,

  tokenBox: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.4rem',
  },

  tokenLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#94A3B8',
  },

  token: {
    fontFamily: 'monospace',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#6366F1',
    letterSpacing: '0.1em',
  },

  tokenHint: {
    fontSize: '0.75rem',
    color: '#94A3B8',
  },

  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    width: '100%',
    marginTop: '0.5rem',
  },

  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.8rem 1.25rem',
    background: 'linear-gradient(135deg, #6366F1, #818CF8)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  } as React.CSSProperties,

  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.75rem 1.25rem',
    background: 'white',
    color: '#475569',
    border: '1px solid #E2E8F0',
    borderRadius: '0.75rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s',
  } as React.CSSProperties,
};

export default PaymentReturnPage;
