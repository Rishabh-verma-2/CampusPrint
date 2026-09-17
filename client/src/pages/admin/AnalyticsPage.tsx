import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  RefreshCw,
  Printer,
  FileText,
  Users,
  Store,
  CreditCard,
  Layers,
  Sparkles,
  PieChart,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Spinner } from '../../components/ui';

const AnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d');

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['adminAnalytics', period],
    queryFn: () => adminApi.getAnalytics(period).then((r) => r.data.data),
  });

  const printActivity = data?.printActivity || {
    totalJobs: 0,
    totalPages: 0,
    bwPages: 0,
    colorPages: 0,
    avgPagesPerOrder: '0',
  };

  const studentActivity = data?.studentActivity || {
    activeStudents: 0,
    repeatUsers: 0,
    jobsPerStudent: '0',
  };

  const vendorPerformance = data?.vendorPerformance || [];
  const statusDistribution = data?.statusDistribution || [];
  const platformFee = data?.platformFee ?? 1;

  const bwPercentage =
    printActivity.totalPages > 0
      ? Math.round((printActivity.bwPages / printActivity.totalPages) * 100)
      : 0;
  const colorPercentage =
    printActivity.totalPages > 0
      ? Math.round((printActivity.colorPages / printActivity.totalPages) * 100)
      : 0;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <BarChart3 size={12} />
            <span>Parul University Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Platform Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Aggregated printing demand, store performance metrics, and student engagement insights
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Period Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(
              [
                { label: 'Today', value: 'today' },
                { label: 'Last 7 Days', value: '7d' },
                { label: 'Last 30 Days', value: '30d' },
              ] as const
            ).map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  period === p.value
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <Spinner />
          <p className="text-xs text-slate-500">Compiling real-time analytics...</p>
        </div>
      ) : (
        <>
          {/* Print Activity Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Print Jobs
                </span>
                <Printer size={16} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{printActivity.totalJobs}</p>
              <span className="text-[11px] text-slate-400">In selected period</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Pages Printed
                </span>
                <FileText size={16} className="text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{printActivity.totalPages}</p>
              <span className="text-[11px] text-slate-400">
                Avg {printActivity.avgPagesPerOrder} pages / job
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Students
                </span>
                <Users size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {studentActivity.activeStudents}
              </p>
              <span className="text-[11px] text-slate-400">
                {studentActivity.repeatUsers} repeat print users
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Platform Fees
                </span>
                <CreditCard size={16} className="text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                ₹{(printActivity.totalJobs * platformFee).toFixed(0)}
              </p>
              <span className="text-[11px] text-slate-400">
                At ₹{platformFee} base convenience fee
              </span>
            </div>
          </div>

          {/* Color Mode & Print Volume Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Color vs B&W Ratio */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                <span>Color vs. Black & White Volume</span>
              </h3>
              <p className="text-xs text-slate-500">
                Distribution of student print jobs by toner color selection
              </p>

              {printActivity.totalPages > 0 ? (
                <div className="space-y-4 pt-2">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${bwPercentage}%` }}
                      className="bg-slate-700 h-full transition-all"
                    />
                    <div
                      style={{ width: `${colorPercentage}%` }}
                      className="bg-blue-600 h-full transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                        <span className="text-xs font-medium text-slate-700">Black & White</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mt-1.5">
                        {printActivity.bwPages}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          pages ({bwPercentage}%)
                        </span>
                      </p>
                    </div>

                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span className="text-xs font-medium text-slate-700">Color</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mt-1.5">
                        {printActivity.colorPages}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          pages ({colorPercentage}%)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pages recorded in this period
                </div>
              )}
            </div>

            {/* Student Engagement Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                <span>Student Adoption & Retention</span>
              </h3>
              <p className="text-xs text-slate-500">
                Student cohort printing frequency across Parul University campus
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50 text-xs">
                  <span className="text-slate-600">Active Students</span>
                  <span className="font-bold text-slate-900">
                    {studentActivity.activeStudents} students
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50 text-xs">
                  <span className="text-slate-600">Repeat Students (&gt;1 order)</span>
                  <span className="font-bold text-slate-900">
                    {studentActivity.repeatUsers} students
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50 text-xs">
                  <span className="text-slate-600">Average Jobs / Active Student</span>
                  <span className="font-bold text-blue-600">
                    {studentActivity.jobsPerStudent}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Store Performance Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Store size={16} className="text-blue-600" />
                  <span>Store Performance & Fulfillment</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Print completion and cancellation breakdown per store
                </p>
              </div>
            </div>

            {vendorPerformance.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No store print jobs recorded in this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Store Name</th>
                      <th className="py-3 px-4 text-center">Total Jobs</th>
                      <th className="py-3 px-4 text-center">Collected</th>
                      <th className="py-3 px-4 text-center">Cancelled</th>
                      <th className="py-3 px-4 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendorPerformance.map((vp: any) => {
                      const rate =
                        vp.totalJobs > 0
                          ? Math.round((vp.completed / vp.totalJobs) * 100)
                          : 0;

                      return (
                        <tr key={vp._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {vp.shopName || 'Campus Store'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {vp.totalJobs}
                          </td>
                          <td className="py-3 px-4 text-center text-emerald-600 font-semibold">
                            {vp.completed}
                          </td>
                          <td className="py-3 px-4 text-center text-rose-600 font-semibold">
                            {vp.cancelled}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                rate >= 80
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : rate >= 50
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
