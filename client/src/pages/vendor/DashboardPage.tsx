import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { vendorApi } from '../../api/vendorApi';
import { Spinner, PageHeader, ErrorState } from '../../components/ui';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { socket } = useSocket();

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['vendorDashboard'],
    queryFn: () => vendorApi.getDashboard().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['vendorAnalytics', '7d'],
    queryFn: () => vendorApi.getAnalytics('7d').then(r => r.data.data),
  });

  React.useEffect(() => {
    if (!socket) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
    socket.on('printJob:new', refresh);
    return () => { socket.off('printJob:new', refresh); };
  }, [socket, qc]);

  const availMutation = useMutation({
    mutationFn: (av: string) => vendorApi.updateAvailability(av),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendorDashboard'] }); toast.success('Availability updated'); },
  });

  if (dashLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size="lg" /></div>;

  const stats = dashData?.stats;
  const vendor = dashData?.vendor;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem' }}>
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'} 👋
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {vendor?.shopName}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="cp-select"
            style={{ width: 'auto' }}
            value={vendor?.availability ?? 'OPEN'}
            onChange={e => availMutation.mutate(e.target.value)}
            id="availability-toggle"
          >
            <option value="OPEN">🟢 Open</option>
            <option value="CLOSED">🔴 Closed</option>
            <option value="UNAVAILABLE">🟡 Unavailable</option>
          </select>
          <button className="cp-btn cp-btn-primary" onClick={() => navigate('/vendor/queue')} id="view-queue-btn">
            View Queue →
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="cp-grid-4" style={{ marginBottom: '1.5rem', gap: '0.85rem' }}>
        {[
          { label: "Today's Orders", value: stats?.totalToday ?? 0, icon: '📋', color: 'var(--brand-400)' },
          { label: 'Waiting', value: stats?.pending ?? 0, icon: '⏳', color: '#f59e0b' },
          { label: 'Printing', value: stats?.printing ?? 0, icon: '🖨️', color: '#3b82f6' },
          { label: 'Ready', value: stats?.ready ?? 0, icon: '✅', color: '#10b981' },
        ].map(card => (
          <div key={card.label} className="cp-stat" style={{ borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>{card.icon}</div>
            <div className="cp-stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="cp-stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue + Completed */}
      <div className="cp-grid-2" style={{ marginBottom: '1.5rem', gap: '0.85rem' }}>
        <div className="cp-stat" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))', borderTop: '3px solid var(--brand-500)' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>💰</div>
          <div className="cp-stat-value">₹{stats?.todayRevenue?.toFixed(0) ?? 0}</div>
          <div className="cp-stat-label">Today's Revenue</div>
        </div>
        <div className="cp-stat" style={{ borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>🎯</div>
          <div className="cp-stat-value">{stats?.completed ?? 0}</div>
          <div className="cp-stat-label">Completed Today</div>
        </div>
      </div>

      {/* Charts */}
      {!analyticsLoading && analyticsData && (
        <div className="cp-grid-2" style={{ gap: '1rem' }}>
          {/* Revenue chart */}
          <div className="cp-card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600 }}>Revenue (7 days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analyticsData.revenueByDay ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-secondary)', fontSize: 11 }}
                  itemStyle={{ color: 'var(--brand-400)' }}
                  formatter={(v: any) => [`₹${v ?? 0}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="url(#brandGrad)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Print type */}
          <div className="cp-card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600 }}>Print Type Distribution</h3>
            {(analyticsData.printTypeDistribution ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={analyticsData.printTypeDistribution}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%" cy="50%" outerRadius={70}
                    label={(entry: any) => `${entry._id || entry.name || ''}: ${entry.count ?? entry.value ?? ''}`}
                    labelLine={false}
                  >
                    {analyticsData.printTypeDistribution.map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No data yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
