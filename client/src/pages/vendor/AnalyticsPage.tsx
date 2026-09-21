import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart2,
  TrendingUp,
  Calendar,
  IndianRupee,
  Printer,
  PieChart as PieIcon,
  Layers,
  Building,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { Spinner, EmptyState } from '../../components/ui';
import { useSocket } from '../../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

const AnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [ledgerTab, setLedgerTab] = useState<'orders' | 'daily'>('orders');
  const { socket } = useSocket();
  const qc = useQueryClient();

  // Real-time earnings: invalidate when new orders arrive (payment already captured at QUEUED time)
  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
      qc.invalidateQueries({ queryKey: ['vendorAnalytics'] });
      qc.invalidateQueries({ queryKey: ['vendorQueue', 'completed'] });
    };
    socket.on('printJob:new', refresh);
    socket.on('printJob:updated', refresh);
    return () => {
      socket.off('printJob:new', refresh);
      socket.off('printJob:updated', refresh);
    };
  }, [socket, qc]);

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['vendorDashboard'],
    queryFn: () => vendorApi.getDashboard().then((r) => r.data.data),
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['vendorAnalytics', period],
    queryFn: () => vendorApi.getAnalytics(period).then((r) => r.data.data),
  });

  const { data: completedJobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['vendorQueue', 'completed'],
    queryFn: () => vendorApi.getQueue({ status: 'completed', limit: 100 }).then((r) => r.data.data),
  });

  if (dashLoading || analyticsLoading || jobsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const vendor = dashData?.vendor;
  const stats = dashData?.stats;

  const revenueByDay: Array<{ _id: string; revenue: number; orders: number }> =
    analyticsData?.revenueByDay || [];
  const printTypeDistribution: Array<{ _id: string; count: number }> =
    analyticsData?.printTypeDistribution || [];
  const completedJobs = completedJobsData?.jobs || [];

  const totalPeriodRevenue = revenueByDay.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const totalPeriodOrders = revenueByDay.reduce((acc, curr) => acc + (curr.orders || 0), 0);
  const avgOrderValue = totalPeriodOrders > 0 ? totalPeriodRevenue / totalPeriodOrders : 0;

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12">
      {/* ─── Top Header & Period Selector ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Analytics & Earnings
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track daily sales, payout revenue, and historical order fulfillments in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <ShieldCheck size={15} />
            <span>Daily Settlement Active</span>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === '7d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === '30d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4 Primary Metric Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Earnings */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl text-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-200 text-xs font-bold uppercase tracking-wider">
            <span>Today's Earnings</span>
            <IndianRupee size={16} />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 font-mono">
            ₹{(stats?.todayRevenue ?? 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-blue-100 mt-1">Accrued today</div>
        </div>

        {/* Total Period Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>{period === '7d' ? '7-Day' : '30-Day'} Revenue</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-2">
            ₹{totalPeriodRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Gross accrued payout</div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Period Orders</span>
            <Printer size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-2">
            {totalPeriodOrders}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total jobs collected</div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Average Order</span>
            <Calendar size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-2">
            ₹{avgOrderValue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Average per customer print</div>
        </div>
      </div>

      {/* ─── Visual Charts Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue Progression</h2>
              <p className="text-xs text-slate-500">Day-by-day sales accrual</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {period === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </span>
          </div>

          <div className="h-64 w-full">
            {revenueByDay.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No revenue records in this timeframe yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueByDay}
                  margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                >
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="_id"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => v?.slice(5) || ''}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: 12,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    formatter={(v: any) => [`₹${v ?? 0}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Color Mode Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Print Type Ratio</h2>
            <p className="text-xs text-slate-500">Black & White vs Color split</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {printTypeDistribution.length === 0 ? (
              <div className="text-xs text-slate-400">No print jobs yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={printTypeDistribution}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={4}
                    label={({ _id, count }: any) => `${_id || 'Other'}: ${count}`}
                  >
                    {printTypeDistribution.map((_: unknown, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─── Payout & Settlement Information ─────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Partner Settlement Information</h2>
            <p className="text-xs text-slate-500">Registered campus shop bank credit status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500">Store Partner</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{vendor?.shopName}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500">Campus Location</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {vendor?.campus?.name || 'Main Campus'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500">Settlement Cycle</div>
            <div className="text-sm font-bold text-emerald-600 mt-0.5">Automated Daily Credit</div>
          </div>
        </div>
      </div>

      {/* ─── Tabbed Ledger Section ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Orders & Revenue Ledger</h2>
            <p className="text-xs text-slate-500">Complete audit trail of all fulfilled print jobs</p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-center">
            <button
              onClick={() => setLedgerTab('orders')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                ledgerTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed Orders ({completedJobs.length})
            </button>
            <button
              onClick={() => setLedgerTab('daily')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                ledgerTab === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Breakdown ({revenueByDay.length})
            </button>
          </div>
        </div>

        {ledgerTab === 'orders' ? (
          completedJobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No completed orders recorded yet. As student pickups are verified, they will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Pickup Token</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Document / Pages</th>
                    <th className="py-3 px-4">Print Type</th>
                    <th className="py-3 px-4 text-right">Gross Price</th>
                    <th className="py-3 px-4 text-right">Vendor Share</th>
                    <th className="py-3 px-4">Fulfilled At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedJobs.map((job: any) => {
                    const studentObj = job.studentId;
                    const customerName = job.customerName || studentObj?.name || 'Student';
                    const doc = job.documentId;
                    const vendorNet = job.pricing?.vendorAmount ?? job.pricing?.total;

                    return (
                      <tr key={job._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {job.publicToken}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{customerName}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-medium text-slate-800 truncate max-w-[160px] inline-block">
                            {doc?.originalName || 'Document.pdf'}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            {job.printConfig?.totalPages} pages × {job.printConfig?.copies} copy
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-[10px]">
                            {job.printConfig?.colorMode === 'BW' ? 'B&W' : 'Color'} ·{' '}
                            {job.printConfig?.sides === 'DOUBLE' ? 'Duplex' : 'Single'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{job.pricing?.total}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          ₹{vendorNet}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(job.updatedAt || job.createdAt).toLocaleDateString()}{' '}
                          {new Date(job.updatedAt || job.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          revenueByDay.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No revenue breakdown records for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Orders Handled</th>
                    <th className="py-3 px-4 text-right">Daily Revenue</th>
                    <th className="py-3 px-4 text-right">Avg Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenueByDay.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{row._id}</td>
                      <td className="py-3 px-4 text-slate-600">{row.orders} orders</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">
                        ₹{(row.revenue || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 font-mono">
                        ₹{row.orders > 0 ? ((row.revenue || 0) / row.orders).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
