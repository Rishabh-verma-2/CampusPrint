import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Building2,
  User,
  X,
  FileText,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';
import { Spinner } from '../../components/ui';

interface ComplaintItem {
  _id: string;
  studentId?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    enrollmentNumber?: string;
  };
  vendorId?: {
    _id: string;
    shopName: string;
  };
  orderId?: {
    _id: string;
    publicToken: string;
  };
  category: string;
  subject?: string;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

const statusOptions = [
  { label: 'All Complaints', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const ComplaintsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [modalStatus, setModalStatus] = useState<string>('OPEN');
  const [modalNotes, setModalNotes] = useState<string>('');

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['adminComplaints', statusFilter],
    queryFn: () =>
      adminApi
        .getComplaints({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        })
        .then((r) => r.data.data),
  });

  const complaints: ComplaintItem[] = data?.complaints || [];
  const total = data?.total ?? complaints.length;

  const openCount = complaints.filter((c) => c.status === 'OPEN').length;
  const inReviewCount = complaints.filter((c) => c.status === 'IN_REVIEW').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;

  const updateMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes: string }) =>
      adminApi.updateComplaint(id, { status, adminNotes }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      toast.success('Complaint status and notes updated');
      const updated = res.data?.data?.complaint;
      if (updated && selectedComplaint?._id === updated._id) {
        setSelectedComplaint(updated);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update complaint');
    },
  });

  const handleOpenDrawer = (complaint: ComplaintItem) => {
    setSelectedComplaint(complaint);
    setModalStatus(complaint.status);
    setModalNotes(complaint.adminNotes || '');
  };

  const handleSaveResolution = () => {
    if (!selectedComplaint) return;
    updateMutation.mutate({
      id: selectedComplaint._id,
      status: modalStatus,
      adminNotes: modalNotes,
    });
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <MessageSquare size={12} />
            <span>Parul University Student Helpdesk</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Complaints & Support
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Resolve student issue tickets, printing disputes, and vendor performance grievances
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
            Total Tickets
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
          <span className="text-[11px] text-slate-400">All registered complaints</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Open / Pending
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{openCount}</p>
          <span className="text-[11px] text-slate-400">Needs admin attention</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Under Review
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{inReviewCount}</p>
          <span className="text-[11px] text-slate-400">Being investigated</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Resolved
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{resolvedCount}</p>
          <span className="text-[11px] text-slate-400">Successfully closed</span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by student, vendor, or ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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

      {/* Complaints Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <p className="text-xs text-slate-500">Loading complaints log...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Complaints</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {statusFilter !== 'ALL'
                ? `No complaints found with status "${statusFilter}".`
                : 'There are currently no complaints or dispute tickets filed by students.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Print Store</th>
                  <th className="py-3 px-4">Order Token</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Reported On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{c._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {c.studentId?.name || 'Student'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.studentId?.enrollmentNumber || c.studentId?.phone || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.vendorId?.shopName || 'Campus Store'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-blue-700">
                      {c.orderId?.publicToken || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {c.category?.replace(/_/g, ' ') || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === 'OPEN'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : c.status === 'IN_REVIEW'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : c.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(c)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye size={13} />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolution & Details Drawer */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedComplaint(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      Ticket #{selectedComplaint._id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        selectedComplaint.status === 'OPEN'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : selectedComplaint.status === 'IN_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : selectedComplaint.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {selectedComplaint.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Complaint Management & Resolution</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {/* Student info */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Student Details
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name</span>
                      <span className="font-semibold text-slate-900">
                        {selectedComplaint.studentId?.name || 'Student'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Enrollment Number</span>
                      <span className="font-mono font-medium text-slate-900">
                        {selectedComplaint.studentId?.enrollmentNumber || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact</span>
                      <span className="font-mono text-slate-900">
                        {selectedComplaint.studentId?.phone || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dispute details */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Dispute Information
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Print Store</span>
                      <span className="font-medium text-slate-900">
                        {selectedComplaint.vendorId?.shopName || 'Campus Store'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Linked Order</span>
                      <span className="font-mono font-bold text-blue-700">
                        {selectedComplaint.orderId?.publicToken || 'None linked'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Category</span>
                      <span className="font-medium text-slate-900">
                        {selectedComplaint.category?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Complaint Statement */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Student Statement
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </div>
                </div>

                {/* Admin Status & Notes Update */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Take Administrative Action
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Change Ticket Status
                    </label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="OPEN">Open (Requires Action)</option>
                      <option value="IN_REVIEW">In Review (Under Investigation)</option>
                      <option value="RESOLVED">Resolved (Issue Settled)</option>
                      <option value="REJECTED">Rejected (Invalid Dispute)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Admin Notes & Resolution Summary
                    </label>
                    <textarea
                      rows={4}
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="Add investigation findings, vendor contact remarks, or student refund notes..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveResolution}
                    disabled={updateMutation.isPending}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? <Spinner /> : <Send size={14} />}
                    <span>Save Ticket Resolution</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsPage;
