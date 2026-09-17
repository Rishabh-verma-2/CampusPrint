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
  Mail,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';
import { AvailabilityBadge, Skeleton, Spinner } from '../../components/ui';

const VendorsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);

  // Add Vendor Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newVendorData, setNewVendorData] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    bwPerPage: 1.5,
    colorPerPage: 5.0,
    duplexDiscount: 0,
    openTime: '08:30',
    closeTime: '20:00',
  });

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

  const createVendorMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVendors'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activeVendors'] });
      toast.success('Vendor store generated and activated! It is now live for students.');
      setIsAddModalOpen(false);
      setNewVendorData({
        shopName: '',
        ownerName: '',
        phone: '',
        email: '',
        address: '',
        bwPerPage: 1.5,
        colorPerPage: 5.0,
        duplexDiscount: 0,
        openTime: '08:30',
        closeTime: '20:00',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to generate vendor store');
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
            id="add-vendor-btn"
          >
            <Plus size={14} />
            <span>Add Vendor</span>
          </button>
        </div>
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

      {/* Vendors Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-100">
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
                : 'No campus print shops have been created in the system yet. Click below to generate one.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>Generate Campus Vendor Store</span>
              </button>
            </div>
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
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((vendor: any) => {
                  const isActive = vendor.status === 'ACTIVE';

                  return (
                    <tr
                      key={vendor._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                            <Store size={15} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {vendor.shopName}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                              {vendor.address}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-700">{vendor.ownerName}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-mono text-slate-600 text-[11px]">
                          {vendor.phone}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {vendor.ordersCount ?? 0}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-medium text-slate-800">
                        ₹{(vendor.revenue ?? 0).toFixed(0)}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedVendor(vendor)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const newStatus = isActive ? 'SUSPENDED' : 'ACTIVE';
                              if (
                                confirm(
                                  `Are you sure you want to mark ${vendor.shopName} as ${newStatus}?`
                                )
                              ) {
                                toggleStatusMutation.mutate({
                                  id: vendor._id,
                                  status: newStatus,
                                });
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Deactivate Store' : 'Activate Store'}
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

      {/* Add / Generate Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in text-left">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Generate Campus Vendor</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create and activate a new print store for Parul University Main Campus
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createVendorMutation.mutate(newVendorData);
                }}
                className="p-5 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store / Shop Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Parul Central Xerox & Stationery"
                    value={newVendorData.shopName}
                    onChange={(e) =>
                      setNewVendorData({ ...newVendorData, shopName: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Owner / Manager Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={newVendorData.ownerName}
                      onChange={(e) =>
                        setNewVendorData({ ...newVendorData, ownerName: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={newVendorData.phone}
                      onChange={(e) =>
                        setNewVendorData({ ...newVendorData, phone: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. centralprint@parul.ac.in"
                    value={newVendorData.email}
                    onChange={(e) =>
                      setNewVendorData({ ...newVendorData, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Location / Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ground Floor, Student Activity Centre, Main Campus"
                    value={newVendorData.address}
                    onChange={(e) =>
                      setNewVendorData({ ...newVendorData, address: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Pricing Config */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Print Pricing Tiers
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        B&W / Page (₹)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        required
                        value={newVendorData.bwPerPage}
                        onChange={(e) =>
                          setNewVendorData({
                            ...newVendorData,
                            bwPerPage: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Color / Page (₹)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        required
                        value={newVendorData.colorPerPage}
                        onChange={(e) =>
                          setNewVendorData({
                            ...newVendorData,
                            colorPerPage: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Duplex Disc. (₹)
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={newVendorData.duplexDiscount}
                        onChange={(e) =>
                          setNewVendorData({
                            ...newVendorData,
                            duplexDiscount: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Opens At
                    </label>
                    <input
                      type="time"
                      value={newVendorData.openTime}
                      onChange={(e) =>
                        setNewVendorData({ ...newVendorData, openTime: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Closes At
                    </label>
                    <input
                      type="time"
                      value={newVendorData.closeTime}
                      onChange={(e) =>
                        setNewVendorData({ ...newVendorData, closeTime: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                  Upon creation, this vendor will be marked <strong>ACTIVE</strong> and <strong>OPEN</strong>, automatically appearing in the students' vendor selection during print jobs.
                </div>

                {/* Modal Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createVendorMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {createVendorMutation.isPending ? <Spinner /> : <Plus size={14} />}
                    <span>Generate Vendor Store</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Details Slide-Out Drawer */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedVendor(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedVendor.shopName}
                  </h3>
                  <p className="text-xs text-slate-500">Parul University Print Store</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVendor(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
                {/* Store Profile Card */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Status</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedVendor.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {selectedVendor.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Store Front</span>
                    <AvailabilityBadge availability={selectedVendor.availability || 'OPEN'} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Owner</span>
                    <span className="font-medium text-slate-900">{selectedVendor.ownerName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Phone</span>
                    <span className="font-mono text-slate-900">{selectedVendor.phone}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Campus Location</span>
                    <span className="text-right text-slate-700 max-w-[200px]">
                      {selectedVendor.address}
                    </span>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Operating Hours
                  </span>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-slate-700">
                      <span>Daily Schedule:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedVendor.operatingHours?.open || '08:30'} -{' '}
                        {selectedVendor.operatingHours?.close || '20:00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing Structure */}
                <div className="space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Printing Rates
                  </span>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between text-slate-700">
                      <span>Black & White per page:</span>
                      <span className="font-bold text-slate-900">
                        ₹{selectedVendor.pricing?.bwPerPage ?? 1.5}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Color per page:</span>
                      <span className="font-bold text-slate-900">
                        ₹{selectedVendor.pricing?.colorPerPage ?? 5}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Duplex Discount:</span>
                      <span className="text-slate-900">
                        ₹{selectedVendor.pricing?.duplexDiscount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                    Store Analytics
                  </span>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between text-slate-700">
                      <span>Lifetime Orders:</span>
                      <span className="font-bold text-slate-900">
                        {selectedVendor.ordersCount ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Total Revenue Generated:</span>
                      <span className="font-bold font-mono text-emerald-600">
                        ₹{(selectedVendor.revenue ?? 0).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedVendor(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsPage;
