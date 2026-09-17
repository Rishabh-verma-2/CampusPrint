import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Building2,
  Printer,
  CreditCard,
  Shield,
  Save,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';
import { Spinner } from '../../components/ui';

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'printing' | 'platform' | 'security'>('general');

  // Form states
  const [formData, setFormData] = useState({
    maxFileSizeMb: 50,
    maxPagesLimit: 250,
    platformFee: 2,
    orderExpiryHours: 48,
    reprintWindowHours: 24,
    supportEmail: 'support@campusprint.in',
    allowGuestPrinting: false,
    maintenanceMode: false,
  });

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data.data),
  });

  useEffect(() => {
    if (data?.settings) {
      setFormData((prev) => ({
        ...prev,
        ...data.settings,
      }));
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => adminApi.updateSettings(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      queryClient.invalidateQueries({ queryKey: ['adminAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['adminPayments'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      toast.success('Platform configuration saved successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const university = data?.university || {
    name: 'Parul University',
    code: 'PU',
    location: 'P.O. Limda, Waghodia, Vadodara - 391760, Gujarat',
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <Sliders size={12} />
            <span>Parul University Configuration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Platform Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure campus printing rules, store constraints, convenience fees, and operational parameters
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

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <Spinner />
          <p className="text-xs text-slate-500">Loading system settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-fit overflow-x-auto">
            {[
              { id: 'general', label: 'University & Campus', icon: Building2 },
              { id: 'printing', label: 'Print Specifications', icon: Printer },
              { id: 'platform', label: 'Fees & Operations', icon: CreditCard },
              { id: 'security', label: 'Security & Access', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: General / University */}
          {activeTab === 'general' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                <span>Institutional Affiliation</span>
              </h3>
              <p className="text-xs text-slate-500">
                Primary university and campus details assigned to this CampusPrint platform instance
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    University Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={university.name}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium cursor-not-allowed"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    CampusPrint is officially configured for Parul University
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Institutional Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={university.code}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-mono font-medium cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Campus Address & Location
                  </label>
                  <input
                    type="text"
                    disabled
                    value={university.location}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Support Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.supportEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, supportEmail: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Printing Specifications */}
          {activeTab === 'printing' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer size={16} className="text-blue-600" />
                <span>Print Job Constraints & Limits</span>
              </h3>
              <p className="text-xs text-slate-500">
                Guardrails applied to student file uploads and print queues across all campus stores
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Max File Upload Size (MB)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={formData.maxFileSizeMb}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxFileSizeMb: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Default limit: 50MB per document
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Max Page Count Limit (Per Job)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={formData.maxPagesLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxPagesLimit: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Prevents accidental oversized print jobs (default: 250 pages)
                  </span>
                </div>

                <div className="md:col-span-2 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">
                    Standard Supported Paper Formats
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['A4 (Standard)', 'A3', 'Legal', 'Letter'].map((fmt) => (
                      <span
                        key={fmt}
                        className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Fees & Operations */}
          {activeTab === 'platform' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard size={16} className="text-blue-600" />
                <span>Fees & Store Lifecycle Rules</span>
              </h3>
              <p className="text-xs text-slate-500">
                Revenue sharing, platform convenience fee, and auto-cleanup timelines
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Platform Convenience Fee (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={formData.platformFee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        platformFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Standard CampusPrint platform convenience fee per order (₹2)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Uncollected Order Expiry (Hours)
                  </label>
                  <input
                    type="number"
                    min={12}
                    max={168}
                    value={formData.orderExpiryHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        orderExpiryHours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    After this duration, ready prints can be marked expired (default: 48h)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Student Re-Print Window (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={formData.reprintWindowHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reprintWindowHours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Window during which a student can request re-print for defects
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Security & Access */}
          {activeTab === 'security' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield size={16} className="text-blue-600" />
                <span>Security & Admin Access</span>
              </h3>
              <p className="text-xs text-slate-500">
                Administrative authentication policy and platform access restrictions
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <Lock size={18} className="text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Developer Admin Account</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Administrator access is restricted to developer credentials (<span className="font-mono text-slate-800">admin@campusprint.com</span>). Password credentials are stored hashed with bcrypt and never exposed in the UI.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <Shield size={18} className="text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Parul University Access Isolation</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All student accounts, campus print stores, and print job tokens are scoped to Parul University Main Campus. Cross-tenant access is prohibited at the database query layer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? <Spinner /> : <Save size={14} />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SettingsPage;
