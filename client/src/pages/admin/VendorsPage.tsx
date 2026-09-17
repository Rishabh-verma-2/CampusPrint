import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Power,
  Phone,
  MapPin,
  Clock,
  X,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';
import { AvailabilityBadge, Skeleton, Spinner } from '../../components/ui';

const VendorsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['adminVendors', statusFilter, search],
    queryFn: () =>
      adminApi
        .getVendors({ status: statusFilter, search: search.trim() || undefined })
        .then((r) => r.data.data),
  });

  const vendors = data?.vendors || [];
  const total = data?.total ?? vendors.length;

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateVendorStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminVendors'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activeVendors'] });
      toast.success(
        variables.status === 'ACTIVE'
          ? 'Vendor store activated successfully'
          : 'Vendor store deactivated / suspended'
      );
      if (selectedVendor && selectedVendor._id === variables.id) {
        setSelectedVendor((prev: any) => ({ ...prev, status: variables.status }));
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update vendor status');
    },
  });

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Vendor Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage campus print shops, verification status, and availability
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

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search vendor by shop name, owner, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED', 'PENDING'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Registered Print Shops ({total})
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-8 sm:p-10 rounded-xl border border-slate-100 bg-slate-50/50 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
              <Store size={20} />
            </div>
            <div className="text-sm font-bold text-slate-800">No vendors registered yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {statusFilter !== 'ALL' || search
                ? 'No vendors match your current search or status filter.'
                : 'No campus print shops have been created in the system.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Vendor / Shop</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Orders</th>
                  <th className="py-3 px-3">Revenue</th>
                  <th className="py-3 px-3">Joined</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((vendor: any) => {
                  const isActive = vendor.status === 'ACTIVE';

                  return (
                    <tr key={vendor._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{vendor.shopName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {vendor.address || 'Campus Location'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {vendor.ownerName || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {vendor.phone || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {vendor.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 font-mono">
                        {vendor.ordersCount ?? 0}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 font-mono">
                        ₹{(vendor.revenue ?? 0).toFixed(0)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(vendor.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedVendor(vendor)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: vendor._id,
                                status: isActive ? 'SUSPENDED' : 'ACTIVE',
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                            className={`p-1.5 rounded-md transition-colors ${
                              isActive
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Deactivate / Suspend Vendor' : 'Activate Vendor'}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Vendor Details Drawer / Modal ─────────────────────────────────── */}
      {selectedVendor && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedVendor(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden text-left animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedVendor.shopName}
                </h3>
                <p className="text-xs text-slate-500">Parul University Vendor Information</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVendor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[11px]">Vendor Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{selectedVendor.status}</span>
                    <AvailabilityBadge availability={selectedVendor.availability || 'OPEN'} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toggleStatusMutation.mutate({
                      id: selectedVendor._id,
                      status: selectedVendor.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    selectedVendor.status === 'ACTIVE'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {selectedVendor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              {/* Vendor Contacts */}
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Store & Owner Details
                </span>
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Owner Name:</span>
                  <span className="font-semibold">{selectedVendor.ownerName || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Phone:</span>
                  <span className="font-mono">{selectedVendor.phone || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Address:</span>
                  <span className="text-slate-500">{selectedVendor.address || 'Campus Print Hub'}</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Configured Pricing
                </span>
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Black & White per page:</span>
                  <span className="font-bold">₹{selectedVendor.pricing?.bwPerPage ?? 2}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Color per page:</span>
                  <span className="font-bold">₹{selectedVendor.pricing?.colorPerPage ?? 5}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Duplex Discount:</span>
                  <span>₹{selectedVendor.pricing?.duplexDiscount ?? 0}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Performance
                </span>
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Lifetime Orders:</span>
                  <span className="font-bold">{selectedVendor.ordersCount ?? 0}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Total Revenue Generated:</span>
                  <span className="font-bold font-mono text-emerald-600">
                    ₹{(selectedVendor.revenue ?? 0).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVendor(null)}
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

export default VendorsPage;
