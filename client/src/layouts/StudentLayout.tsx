import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Printer, Home, FileText, User as UserIcon, Plus, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/common/NotificationBell';

const desktopNavItems = [
  { to: '/student', icon: Home, label: 'Home', end: true },
  { to: '/student/orders', icon: FileText, label: 'My Orders', end: false },
  { to: '/student/profile', icon: UserIcon, label: 'Profile', end: false },
];

const mobileNavItems = [
  { to: '/student', icon: Home, label: 'Home', end: true },
  { to: '/print', icon: Plus, label: 'New Print', isCta: true, end: false },
  { to: '/student/orders', icon: FileText, label: 'Orders', end: false },
  { to: '/student/profile', icon: UserIcon, label: 'Profile', end: false },
];

const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* ─── Top Header (Desktop & Mobile) ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link
            to="/student"
            className="flex items-center gap-2.5 text-slate-900 font-bold text-base tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <span>CampusPrint</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {desktopNavItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                  }`
                }
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Actions: Notification + Avatar Profile Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />

            {/* Profile Menu Dropdown */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(prev => !prev)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                id="student-avatar-btn"
                aria-label="Student profile menu"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-2xs">
                  {initial}
                </div>
                <span className="hidden sm:block text-xs font-semibold text-slate-700 max-w-[100px] truncate">
                  {user?.name?.split(' ')[0] ?? 'Student'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-fade-in text-left">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user?.name ?? 'Student'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      {user?.enrollmentNumber || user?.phone || (user?.email && !user.email.endsWith('@campusprint.internal') ? user.email : 'Parul University')}
                    </p>
                  </div>

                  <Link
                    to="/student/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <UserIcon size={14} className="text-slate-400" />
                    <span>View Profile</span>
                  </Link>

                  <Link
                    to="/student/orders"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileText size={14} className="text-slate-400" />
                    <span>My Print Orders</span>
                  </Link>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 w-full pb-20 md:pb-10">
        <Outlet />
      </main>

      {/* ─── Mobile Bottom Navigation Bar ──────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-sm py-1.5 px-3 flex items-center justify-around">
        {mobileNavItems.map(({ to, icon: Icon, label, isCta, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] transition-colors ${
                isCta
                  ? 'text-blue-600 font-bold'
                  : isActive
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-500 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isCta ? (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mb-0.5 shadow-xs">
                    <Icon size={18} />
                  </div>
                ) : (
                  <div
                    className={`w-6 h-6 flex items-center justify-center mb-0.5 rounded-md ${
                      isActive ? 'text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                )}
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default StudentLayout;
