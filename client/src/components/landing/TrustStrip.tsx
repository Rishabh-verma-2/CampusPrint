import React from 'react';
import { Clock, CreditCard, CheckCircle, Store } from 'lucide-react';

const benefits = [
  {
    icon: Clock,
    title: 'No waiting in line',
    description: 'Submit jobs ahead of time and collect when ready.',
  },
  {
    icon: CreditCard,
    title: 'Secure online payments',
    description: 'Pay exact amounts online without handling cash at the counter.',
  },
  {
    icon: CheckCircle,
    title: 'Track your print order',
    description: 'Real-time job timeline from submission to collection.',
  },
  {
    icon: Store,
    title: 'Multiple campus vendors',
    description: 'Choose from participating stationery shops across your campus.',
  },
];

export const TrustStrip: React.FC = () => {
  return (
    <section className="bg-slate-50 border-b border-slate-200/80 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {benefits.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
