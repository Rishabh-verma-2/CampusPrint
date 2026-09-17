import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  RefreshCw,
  Search,
  AlertCircle,
  ShieldCheck,
  Building2,
  Lock,
  Clock,
  ArrowUpRight,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Spinner } from '../../components/ui';

interface PaymentItem {
  _id: string;
  orderId?: { publicToken: string };
  studentId?: { name: string; email: string; phone: string };
  amount: number;
  currency: string;
  paymentMethod?: string;
  gatewayTransactionId?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

const PaymentsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['adminPayments', search, statusFilter],
    queryFn: () =>
      adminApi
        .getPayments({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        })
        .then((r) => r.data.data),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data.data),
  });

  const payments: PaymentItem[] = data?.payments || [];
  const total = data?.total ?? payments.length;
  const platformFee = settingsData?.settings?.platformFee ?? 1;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-2">
            <Lock size={12} />
            <span>Gateway Inactive • Pre-Activation Mode</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Payments & Transactions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            CampusPrint financial ledger, UPI collections, and platform convenience fee accounting
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="self-start sm:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Integration Notice Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CreditCard size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Payment Gateway Setup Pending Activation
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Online payments (Cashfree PG / UPI) are currently disabled for this phase of the Parul University deployment.
              Print orders are queued directly at campus stores with cash / on-counter collection. Once merchant credentials are provided, automatic payments and ledger disbursements will activate here.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Gateway Status: Offline</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Transactions
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
          <span className="text-[11px] text-slate-400">Processed through gateway</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Gross Processed
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹0.00</p>
          <span className="text-[11px] text-slate-400">Total volume</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Platform Convenience Fee
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">₹{Number(platformFee).toFixed(2)} / order</p>
          <span className="text-[11px] text-slate-400">Configured baseline fee</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Disbursement Mode
          </p>
          <p className="text-sm font-bold text-slate-900 mt-1">Direct Counter / Offline</p>
          <span className="text-[11px] text-slate-400">Vendor settles in-store</span>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by transaction ID, student, order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>

        <div className="flex gap-2">
          {['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <p className="text-xs text-slate-500">Loading payment ledger...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Receipt size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Payment Records</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Online payment gateway is not enabled yet for Parul University. All student print jobs currently bypass online payment collection and are settled directly at the campus print store counters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Order Token</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.gatewayTransactionId || p._id}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-blue-700">
                      {p.orderId?.publicToken || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{p.studentId?.name || 'Student'}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{p.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(p.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
