import React from 'react';
import { Smartphone, Store, Calculator, ShieldCheck } from 'lucide-react';

const reasons = [
  {
    icon: Smartphone,
    title: 'Simple for Students',
    description: 'Place a print order from anywhere on or off campus, set exact options, and collect without physical queues.',
  },
  {
    icon: Store,
    title: 'Efficient for Vendors',
    description: 'Process and organize orders from a single queue. Eliminate untracked paper slips and uncollected prints.',
  },
  {
    icon: Calculator,
    title: 'Transparent Pricing',
    description: 'Students see the exact calculated cost before payment with complete breakdown of pages and rates.',
  },
  {
    icon: ShieldCheck,
    title: 'Centralized Management',
    description: 'Administrators get complete visibility into campus printing activity, vendor performance, and user feedback.',
  },
];

export const WhyCampusPrint: React.FC = () => {
  return (
    <section id="why-campusprint" className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase bg-blue-50 border border-blue-100 px-2.5 py-1 rounded">
            Platform Benefits
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-3">
            Everything needed for a smoother campus printing experience.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Designed to solve the real everyday bottlenecks faced by students and stationery operators across campus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 text-left hover:border-slate-300 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
