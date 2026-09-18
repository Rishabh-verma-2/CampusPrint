import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ListOrdered,
  BarChart2,
  Settings,
  User,
  Printer,
  LogOut,
  Menu,
  X,
  Store,
  Wifi,
  ChevronDown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { vendorApi } from '../api/vendorApi';
import NotificationBell from '../components/common/NotificationBell';
import { toast } from 'sonner';
import { BrandLogo } from '../components/common/BrandLogo';

const navItems = [
  { to: '/vendor', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/vendor/queue', icon: ListOrdered, label: 'Print Queue', end: false },
  { to: '/vendor/analytics', icon: BarChart2, label: 'Analytics & Earnings', end: false },
  { to: '/vendor/pricing', icon: Settings, label: 'Pricing & Rates', end: false },
  { to: '/vendor/profile', icon: User, label: 'Shop Profile', end: false },
];

const VendorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, socket } = useSocket();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch vendor status and shop name
  const { data: dashData } = useQuery({
    queryKey: ['vendorDashboard'],
    queryFn: () => vendorApi.getDashboard().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const vendor = dashData?.vendor;
  const stats = dashData?.stats;

  // Listen to live events to invalidate
  React.useEffect(() => {
    if (!socket) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
    socket.on('printJob:new', refresh);
    socket.on('printJob:updated', refresh);
    return () => {
      socket.off('printJob:new', refresh);
      socket.off('printJob:updated', refresh);
    };
  }, [socket, qc]);

  const availMutation = useMutation({
    mutationFn: (av: string) => vendorApi.updateAvailability(av),
    onSuccess: (_, newAv) => {
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
      toast.success(`Store status changed to ${newAv}`);
    },
    onError: () => toast.error('Failed to update availability'),
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = (vendor?.shopName || user?.name || 'V').charAt(0).toUpperCase();

  const availability = vendor?.availability || 'CLOSED';
  const availColor =
    availability === 'OPEN'
      ? 'bg-emerald-500'
      : availability === 'UNAVAILABLE'
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 selection:bg-blue-100 selection:text-blue-900 text-left">
      {/* ─── Mobile Header ─────────────────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-900 truncate">
              {vendor?.shopName || 'Vendor Portal'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span className={`w-2 h-2 rounded-full ${availColor}`} />
              <span className="capitalize font-semibold text-slate-700">
                {availability.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ─── Mobile Drawer Backdrop ────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 md:z-20 w-64 h-screen bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & Store Header */}
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <BrandLogo
            size="md"
            subtitle={<span className="text-xs text-blue-600 font-semibold">{vendor?.shopName || 'Vendor Station'}</span>}
          />

          <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${availColor} animate-pulse`} />
              <span className="font-semibold text-slate-700">{availability}</span>
            </div>
            <select
              aria-label="Store Availability"
              value={availability}
              onChange={(e) => availMutation.mutate(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-blue-600 border-none outline-hidden cursor-pointer hover:underline"
            >
              <option value="OPEN">Open</option>
              <option value="BUSY">Busy</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-2">
            Operations
          </div>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} />
                <span>{label}</span>
              </div>
              {label === 'Print Queue' && (stats?.pending ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {stats.pending}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Real-time Connection Indicator */}
        <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Wifi size={12} className={isConnected ? 'text-emerald-500' : 'text-slate-300'} />
            <span>{isConnected ? 'Realtime Sync Active' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Vendor Profile & Logout */}
        <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {vendor?.ownerName || user?.name || 'Shop Partner'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate">
                {user?.email || 'Vendor Portal'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Canvas ───────────────────────────────────────────── */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top bar on Desktop */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-6 py-3 items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${availColor}`} />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Store {availability}
              </span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="text-xs text-slate-500 font-medium">
              Campus Stationery Hub
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick availability toggle buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => availMutation.mutate('OPEN')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  availability === 'OPEN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Open
              </button>
              <button
                onClick={() => availMutation.mutate('UNAVAILABLE')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  availability === 'UNAVAILABLE'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Busy
              </button>
              <button
                onClick={() => availMutation.mutate('CLOSED')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  availability === 'CLOSED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Closed
              </button>
            </div>

            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
