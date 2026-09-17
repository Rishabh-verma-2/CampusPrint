import React from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Store,
  FileText,
  CreditCard,
  BarChart3,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

const adminCapabilities = [
  { icon: Users, title: 'Students', desc: 'Manage registered students & view activity' },
  { icon: Store, title: 'Vendors', desc: 'Onboard, verify, and approve campus shops' },
  { icon: FileText, title: 'Print Orders', desc: 'Campus-wide visibility over all print jobs' },
  { icon: CreditCard, title: 'Transactions', desc: 'Monitor payments and settlement status' },
  { icon: Sliders, title: 'Pricing & Caps', desc: 'Configure platform fees and upload limits' },
  { icon: Building2, title: 'Campus Locations', desc: 'Add universities, colleges & branches' },
  { icon: BarChart3, title: 'Reports & Logs', desc: 'Export audit trails and usage statistics' },
  { icon: ShieldCheck, title: 'Platform Health', desc: 'Manage system settings and maintenance' },
];

export const AdminSection: React.FC = () => {
  return (
    <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase bg-blue-50 border border-blue-100 px-2.5 py-1 rounded">
            Central Administration
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mt-3">
            One platform for managing campus printing
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Campus-wide governance for university administrators across multiple campuses, vendors, and academic departments.
          </p>
        </div>

        {/* Administration Preview Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-5xl mx-auto space-y-8">
          
          {/* Top Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-100 text-left">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Active Campuses</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">3 Universities</span>
              <span className="text-[11px] text-emerald-600 font-medium">100% operational</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Stationery Vendors</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">14 Verified</span>
              <span className="text-[11px] text-slate-500">Across 6 campuses</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Orders This Week</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">1,420 Jobs</span>
              <span className="text-[11px] text-emerald-600 font-medium">+14% vs last week</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Revenue (7d)</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">₹28,650</span>
              <span className="text-[11px] text-slate-500">Settled digitally</span>
            </div>
          </div>

          {/* Management Modules Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Comprehensive Management Modules
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {adminCapabilities.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-900">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security & Multi-tenant note */}
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Role-based access control with comprehensive audit logs and complaint resolution workflows.</span>
            </div>
            <span className="text-slate-500 font-mono text-[11px] hidden sm:inline-block">Auth: Multi-Role JWT</span>
          </div>

        </div>

      </div>
    </section>
  );
};
