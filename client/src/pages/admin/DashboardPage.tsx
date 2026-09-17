import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Store,
  FileText,
  IndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart2,
  ArrowRight,
  Eye,
  RefreshCw,
  Building2,
  X,
  FileDown,
  Printer,
  Calendar,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Spinner, StatusBadge, Skeleton } from '../../components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { PrintJob } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  QUEUED: '#f59e0b',
  ACCEPTED: '#3b82f6',
  PRINTING: '#8b5cf6',
  READY: '#06b6d4',
  COLLECTED: '#10b981',
  CANCELLED: '#ef4444',
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<PrintJob | null>(null);

  const {
    data: dashData,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => adminApi.getDashboard().then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const stats = dashData?.stats;
  const university = dashData?.university;
  const orders7Days = dashData?.orders7Days || [];
  const revenue7Days = dashData?.revenue7Days || [];
  const statusDistribution = dashData?.statusDistribution || [];
  const recentOrders: PrintJob[] = dashData?.recentOrders || [];

  const totalOrdersLast7Days = orders7Days.reduce((sum: number, o: any) => sum + (o.orders || 0), 0);
  const totalStatusCount = statusDistribution.reduce((sum: number, s: any) => sum + (s.count || 0), 0);

  const kpis = [
    {
      label: 'Total Students',
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/admin/students',
    },
    {
      label: 'Active Vendors',
      value: stats?.activeVendors ?? 0,
      icon: Store,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: '/admin/vendors',
    },
    {
      label: "Today's Orders",
      value: stats?.todayJobs ?? 0,
      icon: FileText,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      link: '/admin/orders',
    },
    {
      label: "Today's Revenue",
      value: `₹${(stats?.todayRevenue ?? 0).toFixed(0)}`,
      icon: IndianRupee,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      note: 'Payments disabled',
    },
    {
      label: 'Pending Jobs',
      value: stats?.pendingJobs ?? 0,
      icon: Clock,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      link: '/admin/orders?status=QUEUED',
    },
    {
      label: 'Completed Today',
      value: stats?.completedJobs ?? 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Cancelled Today',
      value: stats?.cancelledJobs ?? 0,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Platform Fee Today',
      value: `₹${(stats?.todayPlatformFee ?? 0).toFixed(0)}`,
      icon: BarChart2,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in text-left">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
        <div className="text-red-600 font-bold text-base">Unable to load dashboard data</div>
        <p className="text-xs text-slate-500">Please check your network or server connection.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* ─── Header with Parul University context ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <Building2 size={12} />
              <span>{university?.name || 'Parul University'} ({university?.code || 'PU'})</span>
            </span>
            <span className="text-xs text-slate-400">• {university?.location || 'Vadodara, Gujarat'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
            Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            CampusPrint Platform Overview & Operations Management
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="self-start sm:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ─── 8 Real-time KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              onClick={() => k.link && navigate(k.link)}
              className={`bg-white border border-slate-200 rounded-xl p-4 shadow-xs transition-all ${
                k.link ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  {k.label}
                </span>
                <div className={`w-7 h-7 rounded-lg ${k.bg} ${k.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={15} />
                </div>
              </div>

              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {k.value}
              </div>

              {k.note && (
                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                  {k.note}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Charts Section ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Orders (7 days) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Orders (7 days)</h2>
              <p className="text-[11px] text-slate-400">Total print jobs placed per day</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {totalOrdersLast7Days} total
            </span>
          </div>

          <div className="h-52 w-full flex-1 flex items-center justify-center">
            {totalOrdersLast7Days === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">
                No orders placed in the last 7 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orders7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="orders" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue (7 days) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revenue (7 days)</h2>
              <p className="text-[11px] text-slate-400">Successful collected revenue</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              ₹0.00
            </span>
          </div>

          <div className="h-52 w-full flex-1 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <IndianRupee size={18} />
              </div>
              <div className="text-xs font-semibold text-slate-700">Payment system pending</div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                Payments are not integrated yet. Chart will activate once Cashfree goes live.
              </p>
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Status Distribution</h2>
              <p className="text-[11px] text-slate-400">Current print job status breakdown</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {totalStatusCount} total
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {totalStatusCount === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">
                No orders in the database.
              </div>
            ) : (
              <div className="space-y-2.5">
                {statusDistribution.map((item: any) => {
                  const pct = totalStatusCount > 0 ? Math.round((item.count / totalStatusCount) * 100) : 0;
                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.label}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── Recent Orders Section ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
            <p className="text-xs text-slate-500">Live print jobs from Parul University campus</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <span>View all orders</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 rounded-xl border border-slate-100 bg-slate-50/50 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
              <FileText size={20} />
            </div>
            <div className="text-sm font-bold text-slate-800">No print jobs yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When students submit print jobs, they will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Token</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Documents</th>
                  <th className="py-2.5 px-3">Pages</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((job) => {
                  const student = typeof job.studentId === 'object' ? (job.studentId as any) : null;
                  const vendor = typeof job.vendorId === 'object' ? (job.vendorId as any) : null;
                  const doc = typeof job.documentId === 'object' ? (job.documentId as any) : null;
                  const docCount = (job as any).documentIds?.length || 1;
                  const totalPages = job.printConfig?.totalPages || doc?.pageCount || 1;

                  return (
                    <tr key={job._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">
                        {job.publicToken}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {job.customerName || student?.name || 'Student'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {job.customerEnrollment || job.customerIdentifier || student?.phone || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {vendor?.shopName || 'Store'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {docCount} {docCount === 1 ? 'file' : 'files'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {totalPages} pages
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 font-mono">
                        ₹{job.pricing?.total ?? 0}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(job.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(job)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Order Details Drawer / Modal ─────────────────────────────────── */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrder(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden text-left animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Order Details — {selectedOrder.publicToken}
                </h3>
                <p className="text-xs text-slate-500">Parul University CampusPrint</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[11px]">Current Status</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">Total Amount</span>
                  <span className="font-bold text-base text-slate-900 font-mono">
                    ₹{selectedOrder.pricing?.total ?? 0}
                  </span>
                </div>
              </div>

              {/* Student Details */}
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Student Information
                </span>
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Name:</span>
                  <span className="font-semibold">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Enrollment / ID:</span>
                  <span className="font-mono">{selectedOrder.customerEnrollment || selectedOrder.customerIdentifier || '-'}</span>
                </div>
                {selectedOrder.customerPhone && (
                  <div className="flex justify-between text-slate-700">
                    <span>Phone:</span>
                    <span className="font-mono">{selectedOrder.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Store Details */}
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Printing Store
                </span>
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Store Name:</span>
                  <span className="font-semibold">
                    {(selectedOrder.vendorId as any)?.shopName || 'Store'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Location:</span>
                  <span className="text-slate-500 truncate max-w-[220px]">
                    {(selectedOrder.vendorId as any)?.address || 'Campus Print Hub'}
                  </span>
                </div>
              </div>

              {/* Print Config */}
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Print Specifications
                </span>
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Color Mode:</span>
                  <span className="font-semibold">{selectedOrder.printConfig?.colorMode === 'COLOR' ? 'Color' : 'Black & White'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Sides:</span>
                  <span className="font-semibold">{selectedOrder.printConfig?.sides === 'DOUBLE' ? 'Double-Sided' : 'Single-Sided'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Copies:</span>
                  <span className="font-semibold">{selectedOrder.printConfig?.copies ?? 1}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Total Pages:</span>
                  <span className="font-semibold">{selectedOrder.printConfig?.totalPages ?? 1} pages</span>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Order Timeline
                </span>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Submitted:</span>
                  <span>{new Date(selectedOrder.createdAt).toLocaleString('en-IN')}</span>
                </div>
                {selectedOrder.collectedAt && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Collected:</span>
                    <span>{new Date(selectedOrder.collectedAt).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
