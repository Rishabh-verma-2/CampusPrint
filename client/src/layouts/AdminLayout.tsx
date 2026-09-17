import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  ListOrdered,
  CreditCard,
  BarChart2,
  MessageSquare,
  Settings,
  ShieldCheck,
  ScrollText,
  Printer,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/universities', icon: Building2, label: 'Universities', end: false },
      { to: '/admin/vendors', icon: Store, label: 'Vendors', end: false },
      { to: '/admin/students', icon: Users, label: 'Students', end: false },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/orders', icon: ListOrdered, label: 'Orders', end: false },
      { to: '/admin/payments', icon: CreditCard, label: 'Payments', end: false },
      { to: '/admin/complaints', icon: MessageSquare, label: 'Complaints', end: false },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/admin/analytics', icon: BarChart2, label: 'Analytics', end: false },
      { to: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs', end: false },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Settings', end: false },
    ],
  },
];

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 selection:bg-blue-100 selection:text-blue-900 text-left">
      {/* ─── Mobile Header ─────────────────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">CampusPrint</div>
            <div className="text-[10px] text-slate-500 font-medium">Parul University Admin</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
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
        className={`fixed md:sticky top-0 bottom-0 left-0 z-50 md:z-20 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo & University Context */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base tracking-tight text-slate-900 leading-none">
                CampusPrint
              </div>
              <div className="text-xs text-blue-600 font-semibold mt-1 truncate">
                Parul University
              </div>
            </div>
          </div>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600">
            <ShieldCheck size={12} className="text-blue-600" />
            <span>Admin Console</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                {group.label}
              </div>
              <div className="space-y-0.5 pt-1">
                {group.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Admin Profile & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate">
                {user?.role || 'SUPER_ADMIN'}
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
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
