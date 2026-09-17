import React from 'react';
import { ShieldCheck, Lock, CheckCircle, Receipt, ArrowRight } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  return (
    <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100/70 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Payments handled securely.
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            CampusPrint uses secure payment infrastructure so students can pay online without handling cash at the counter. Every transaction generates an instant verifiable print token.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-blue-600 mb-2" />
              <h4 className="text-xs font-semibold text-slate-900">Encrypted Processing</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Direct bank-grade processing via verified payment gateway channels.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <Receipt className="w-5 h-5 text-blue-600 mb-2" />
              <h4 className="text-xs font-semibold text-slate-900">Digital Receipts</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Itemized breakdown saved in student order history for every job.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <CheckCircle className="w-5 h-5 text-blue-600 mb-2" />
              <h4 className="text-xs font-semibold text-slate-900">Refund Protection</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Automated refund mechanisms for cancelled or unfulfilled print orders.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
