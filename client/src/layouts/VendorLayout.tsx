import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ListOrdered, BarChart2, DollarSign,
  Settings, User, ChevronLeft, ChevronRight, Printer, Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/common/NotificationBell';

const navItems = [
  { to: '/vendor', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/vendor/queue', icon: ListOrdered, label: 'Print Queue', end: false },
  { to: '/vendor/analytics', icon: BarChart2, label: 'Analytics', end: false },
  { to: '/vendor/earnings', icon: DollarSign, label: 'Earnings', end: false },
  { to: '/vendor/pricing', icon: Settings, label: 'Pricing', end: false },
  { to: '/vendor/profile', icon: User, label: 'Profile', end: false },
];

const VendorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? 64 : 220,
          background: 'var(--surface-card)',
          borderRight: '1px solid var(--surface-border)',
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100dvh',
          transition: 'width 0.25s ease',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? '1.2rem 0' : '1.2rem 1rem',
            display: 'flex', alignItems: 'center',
            gap: '0.6rem', justifyContent: collapsed ? 'center' : 'flex-start',
            borderBottom: '1px solid var(--surface-border)',
          }}
        >
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🖨️</span>
          {!collapsed && (
            <span
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
                background: 'var(--gradient-brand)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                whiteSpace: 'nowrap',
              }}
            >
              CampusPrint
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflow: 'hidden' }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center',
                gap: '0.65rem',
                padding: collapsed ? '0.7rem 0' : '0.65rem 0.85rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '10px', marginBottom: '0.2rem',
                textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 500,
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--gradient-brand)' : 'transparent',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 10px rgba(99,102,241,0.25)' : 'none',
                whiteSpace: 'nowrap',
              })}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* User + collapse */}
        <div style={{ borderTop: '1px solid var(--surface-border)', padding: '0.75rem 0.5rem' }}>
          {!collapsed && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--gradient-brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0,
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Vendor</div>
              </div>
            </div>
          )}
          <button
            className="cp-btn cp-btn-ghost cp-btn-full"
            onClick={() => setCollapsed((c) => !c)}
            style={{ justifyContent: 'center', fontSize: '0.8rem' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} />&nbsp;Collapse</>}
          </button>
          <button
            className="cp-btn cp-btn-ghost cp-btn-full"
            onClick={logout}
            style={{ justifyContent: 'center', fontSize: '0.8rem', color: '#f87171', marginTop: '0.3rem' }}
          >
            {collapsed ? '⏻' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 30,
            background: 'rgba(15, 15, 26, 0.9)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--surface-border)',
            padding: '0 1.5rem', height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Vendor Dashboard
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <NotificationBell />
          </div>
        </div>
        <main style={{ flex: 1, padding: '1.5rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
