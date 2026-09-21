import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  Building,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { Spinner } from '../../components/ui';
import { toast } from 'sonner';

const DAYS_MAP = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

const ProfilePage: React.FC = () => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vendorProfile'],
    queryFn: () => vendorApi.getProfile().then((r) => r.data.data),
  });

  const vendor = data?.vendor;

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    if (vendor) {
      setShopName(vendor.shopName || '');
      setOwnerName(vendor.ownerName || '');
      setPhone(vendor.phone || '');
      setAddress(vendor.address || '');
      if (vendor.operatingHours) {
        setOpenTime(vendor.operatingHours.open || '09:00');
        setCloseTime(vendor.operatingHours.close || '21:00');
        if (Array.isArray(vendor.operatingHours.days)) {
          setActiveDays(vendor.operatingHours.days);
        }
      }
    }
  }, [vendor]);

  const updateMutation = useMutation({
    mutationFn: (updateData: Record<string, unknown>) => vendorApi.updateProfile(updateData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendorProfile'] });
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
      toast.success('Shop profile updated successfully');
    },
    onError: () => toast.error('Failed to update shop profile'),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      shopName,
      ownerName,
      phone,
      address,
      operatingHours: {
        open: openTime,
        close: closeTime,
        days: activeDays,
      },
    });
  };

  const toggleDay = (dayId: number) => {
    if (activeDays.includes(dayId)) {
      setActiveDays(activeDays.filter((d) => d !== dayId));
    } else {
      setActiveDays([...activeDays, dayId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-left pb-12">
      {/* ─── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Shop Profile & Operating Hours
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage your store details, contact numbers, campus location, and store hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span>Verified Campus Partner</span>
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ─── Store Information ───────────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Stationery Store Information</h2>
              <p className="text-xs text-slate-500">Public details visible to students</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Shop Name</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Partner / Owner Name</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Partner Email</label>
              <input
                type="email"
                disabled
                value={vendor?.userId?.email || 'vendor@campusprint.in'}
                className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Address / Landmark</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Near Parul University Gate 2, Main Student Center"
                className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* ─── Campus & University Affiliation ─────────────────────────────────── */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Campus Affiliation</h2>
              <p className="text-xs text-slate-500">Allocated university premises</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500">University</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {vendor?.universityId?.name || 'Parul University'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500">Campus</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {vendor?.campusId?.name || 'Main Campus'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Operating Hours Schedule ────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Operating Hours & Schedule</h2>
              <p className="text-xs text-slate-500">Timings when students can pickup orders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Closing Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Operating Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_MAP.map((day) => {
                const isSelected = activeDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Submit Button ───────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all"
          >
            {updateMutation.isPending ? <Spinner size="sm" /> : <Save size={16} />}
            <span>Save Profile & Timings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
