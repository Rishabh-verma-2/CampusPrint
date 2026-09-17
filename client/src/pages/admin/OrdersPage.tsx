import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  Search,
  RefreshCw,
  Eye,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Building2,
  User,
  Phone,
  Layers,
  Sparkles,
  X,
  CreditCard,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { StatusBadge, Spinner } from '../../components/ui';

interface AdminOrder {
  _id: string;
  publicToken: string;
  studentId?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    enrollmentNumber?: string;
  };
  customerName?: string;
  customerPhone?: string;
  customerEnrollment?: string;
  vendorId?: {
    _id: string;
    shopName: string;
    phone?: string;
    address?: string;
  };
  documentId?: {
    _id: string;
    originalName: string;
    fileSize: number;
    pageCount: number;
    fileType?: string;
  };
  documentIds?: Array<{
    _id: string;
    originalName: string;
    fileSize: number;
    pageCount: number;
    fileType?: string;
  }>;
  printConfig: {
    colorMode: 'BW' | 'COLOR';
    doubleSided: boolean;
    paperSize: string;
    copies: number;
    totalPages: number;
    binding?: string;
    orientation?: string;
  };
  pricing: {
    perPage: number;
    subtotal: number;
    platformFee: number;
    total: number;
  };
  status: string;
  createdAt: string;
  updatedAt?: string;
  timeline?: {
    queuedAt?: string;
    acceptedAt?: string;
    printedAt?: string;
    collectedAt?: string;
    cancelledAt?: string;
  };
}

const statusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Printing', value: 'PRINTING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Collected', value: 'COLLECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const OrdersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['adminOrders', search, statusFilter],
    queryFn: () =>
      adminApi
        .getOrders({
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        })
        .then((r) => r.data.data),
  });

  const { data: singleOrderData, isLoading: isLoadingSingle } = useQuery({
    queryKey: ['adminOrderSingle', selectedOrderId],
    queryFn: () =>
      selectedOrderId ? adminApi.getOrderById(selectedOrderId).then((r) => r.data.data) : null,
    enabled: !!selectedOrderId,
  });

  const jobs: AdminOrder[] = data?.jobs || [];
  const total = data?.total ?? jobs.length;

  const completedCount = jobs.filter((j) => j.status === 'COLLECTED').length;
  const inProgressCount = jobs.filter((j) =>
    ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY'].includes(j.status)
  ).length;
  const cancelledCount = jobs.filter((j) => j.status === 'CANCELLED').length;

  const selectedOrder = singleOrderData?.job || jobs.find((j) => j._id === selectedOrderId);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <Printer size={12} />
            <span>Parul University Print Stream</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Print Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor, audit, and inspect student print jobs across campus print stores
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Orders
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
          <span className="text-[11px] text-slate-400">All registered print jobs</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            In Progress
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{inProgressCount}</p>
          <span className="text-[11px] text-slate-400">Queued or being printed</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Completed
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
          <span className="text-[11px] text-slate-400">Collected by students</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Cancelled
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{cancelledCount}</p>
          <span className="text-[11px] text-slate-400">Voided or declined</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search by token (e.g. CP-1234), student, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <p className="text-xs text-slate-500">Loading print orders...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileText size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search || statusFilter !== 'ALL'
                ? 'No print orders match the selected filters.'
                : 'No student print jobs recorded in the system yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Token</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Vendor Shop</th>
                  <th className="py-3 px-4">Specs & Pages</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const studentName =
                    job.studentId?.name || job.customerName || 'Student';
                  const studentPhone =
                    job.studentId?.phone || job.customerPhone || '';
                  const studentEnrollment =
                    job.studentId?.enrollmentNumber || job.customerEnrollment || '';
                  const shopName = job.vendorId?.shopName || 'Campus Store';

                  return (
                    <tr
                      key={job._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {job.publicToken}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {studentEnrollment || studentPhone || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{shopName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {job.printConfig?.totalPages || 1} pages × {job.printConfig?.copies || 1}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {job.printConfig?.colorMode === 'COLOR' ? 'Color' : 'B&W'} •{' '}
                          {job.printConfig?.doubleSided ? 'Double-sided' : 'Single-sided'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ₹{job.pricing?.total ?? 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={job.status as any} showIcon={false} />
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>
                          {new Date(job.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(job.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(job._id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          <Eye size={14} />
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

      {/* Order Details Drawer */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrderId(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-blue-700">
                      {selectedOrder?.publicToken}
                    </span>
                    {selectedOrder && (
                      <StatusBadge status={selectedOrder.status as any} showIcon={false} />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Order Details & History</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {isLoadingSingle ? (
                  <div className="p-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : selectedOrder ? (
                  <>
                    {/* Student Info */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={13} /> Student Details
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Name</span>
                          <span className="font-semibold text-slate-900">
                            {selectedOrder.studentId?.name || selectedOrder.customerName || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Enrollment</span>
                          <span className="font-mono font-medium text-slate-900">
                            {selectedOrder.studentId?.enrollmentNumber ||
                              selectedOrder.customerEnrollment ||
                              '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Contact</span>
                          <span className="font-mono text-slate-900">
                            {selectedOrder.studentId?.phone || selectedOrder.customerPhone || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Store Info */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={13} /> Assigned Print Store
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Shop Name</span>
                          <span className="font-semibold text-slate-900">
                            {selectedOrder.vendorId?.shopName || 'Campus Store'}
                          </span>
                        </div>
                        {selectedOrder.vendorId?.address && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Location</span>
                            <span className="text-slate-700 text-right">
                              {selectedOrder.vendorId.address}
                            </span>
                          </div>
                        )}
                        {selectedOrder.vendorId?.phone && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Shop Phone</span>
                            <span className="font-mono text-slate-700">
                              {selectedOrder.vendorId.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Print Configuration */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={13} /> Print Specifications
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Color Mode</span>
                          <span className="font-semibold text-slate-900">
                            {selectedOrder.printConfig?.colorMode === 'COLOR'
                              ? 'Full Color'
                              : 'Black & White'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Sides</span>
                          <span className="font-medium text-slate-900">
                            {selectedOrder.printConfig?.doubleSided
                              ? 'Double-Sided (Duplex)'
                              : 'Single-Sided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Copies</span>
                          <span className="font-medium text-slate-900">
                            {selectedOrder.printConfig?.copies || 1}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Page Count</span>
                          <span className="font-bold text-slate-900">
                            {selectedOrder.printConfig?.totalPages || 1} pages
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Documents List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={13} /> Documents
                      </h4>
                      <div className="space-y-2">
                        {selectedOrder.documentIds && selectedOrder.documentIds.length > 0 ? (
                          selectedOrder.documentIds.map((doc: any, idx: number) => (
                            <div
                              key={doc._id || idx}
                              className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between"
                            >
                              <div className="truncate max-w-[240px]">
                                <p className="font-medium text-slate-900 truncate">
                                  {doc.originalName}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {doc.pageCount} pages • {(doc.fileSize / 1024).toFixed(0)} KB
                                </p>
                              </div>
                            </div>
                          ))
                        ) : selectedOrder.documentId ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between">
                            <div className="truncate max-w-[240px]">
                              <p className="font-medium text-slate-900 truncate">
                                {selectedOrder.documentId.originalName}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {selectedOrder.documentId.pageCount} pages •{' '}
                                {(selectedOrder.documentId.fileSize / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No document file attached</p>
                        )}
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={13} /> Pricing Breakdown
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Printing Subtotal</span>
                          <span className="font-medium text-slate-900">
                            ₹{selectedOrder.pricing?.subtotal ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Platform Convenience Fee</span>
                          <span className="font-medium text-slate-900">
                            ₹{selectedOrder.pricing?.platformFee ?? 2}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                          <span className="text-slate-900">Total Charged</span>
                          <span className="text-blue-700">₹{selectedOrder.pricing?.total ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Order not found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
