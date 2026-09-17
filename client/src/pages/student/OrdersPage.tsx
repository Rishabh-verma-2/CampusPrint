import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Inbox } from 'lucide-react';
import { printJobApi } from '../../api/printJobApi';
import { StatusBadge, Spinner, EmptyState, PageHeader, TokenDisplay } from '../../components/ui';
import type { PrintJob } from '../../types';

const TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'COLLECTED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY', 'PAYMENT_PENDING'];

const StudentOrdersPage: React.FC = () => {
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const statusParam = tab === 'active' ? undefined : tab || undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['myJobs', tab],
    queryFn: () => printJobApi.getMyJobs({ status: statusParam, limit: 50 }).then(r => r.data.data),
  });

  let jobs: PrintJob[] = data?.jobs ?? [];

  // Client-side active filter
  if (tab === 'active') {
    jobs = jobs.filter(j => ACTIVE_STATUSES.includes(j.status));
  }

  // Search by token
  if (search) {
    jobs = jobs.filter(j => j.publicToken.toLowerCase().includes(search.toLowerCase()));
  }

  return (
    <div className="cp-page animate-fade-in">
      <PageHeader title="My Orders" subtitle={`${data?.total ?? 0} total orders`} />

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          className="cp-input"
          style={{ paddingLeft: '2.25rem' }}
          placeholder="Search by token (CP-XXXX)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="order-search"
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {TABS.map(t => (
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

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner size="lg" />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Inbox size={40} />}
          title="No orders found"
          description="Start a new print job to see it here."
          action={
            <button className="cp-btn cp-btn-primary" onClick={() => navigate('/print')}>
              + New Print Job
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {jobs.map(job => {
            const doc = typeof job.documentId === 'object' ? (job.documentId as { originalName: string; pageCount: number }) : null;
            const vendor = typeof job.vendorId === 'object' ? (job.vendorId as { shopName: string }) : null;
            return (
              <div
                key={job._id}
                className="cp-card"
                style={{ cursor: 'pointer', padding: '1rem' }}
                onClick={() => navigate(`/student/orders/${job._id}`)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <TokenDisplay token={job.publicToken} />
                      <StatusBadge status={job.status} />
                    </div>
                    <p style={{ margin: '0', fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📄 {doc?.originalName ?? 'Document'} · {doc?.pageCount ?? '?'} pages
                    </p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      🏪 {vendor?.shopName ?? ''} · ₹{job.pricing.total} · {' '}
                      {new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentOrdersPage;
