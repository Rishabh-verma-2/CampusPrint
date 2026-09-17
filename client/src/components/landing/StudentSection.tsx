import React from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Store,
  Sliders,
  DollarSign,
  CreditCard,
  Ticket,
  Clock,
  History,
  ArrowRight,
  FileCheck,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

const studentFeatures = [
  { icon: Smartphone, label: 'Upload documents from phone or laptop' },
  { icon: Store, label: 'Select a campus stationery vendor' },
  { icon: Sliders, label: 'Choose printing preferences' },
  { icon: DollarSign, label: 'See price before payment' },
  { icon: CreditCard, label: 'Secure online payment' },
  { icon: Ticket, label: 'Receive a unique print token' },
  { icon: Clock, label: 'Track order status' },
  { icon: History, label: 'View previous print orders' },
];

export const StudentSection: React.FC = () => {
  return (
    <section id="students" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Column: Product Information & Feature List */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase bg-blue-50 border border-blue-100 px-2.5 py-1 rounded">
                Student Experience
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mt-3">
                Built around the way students actually print.
              </h2>
              <p className="text-base text-slate-600 mt-3 leading-relaxed">
                CampusPrint removes the unnecessary steps between having a document and getting it printed. No emailing PDFs to shopkeepers, waiting in crowded lines between classes, or carrying exact change.
              </p>
            </div>

            {/* Checklist of features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {studentFeatures.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <div className="w-6 h-6 rounded bg-white border border-slate-200 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors"
              >
                <span>Start a Print Order</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Realistic Student Order Timeline UI */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm max-w-lg mx-auto">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-medium text-slate-500">Order #CP-2084</span>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Data Structures Lecture Notes.pdf
                  </h4>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  In Progress
                </span>
              </div>

              {/* Order Timeline Visual */}
              <div className="py-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">1. Order Placed & Paid</p>
                    <p className="text-[11px] text-slate-500">10:14 AM • ₹36.00 via UPI</p>
                  </div>
                </div>

                <div className="ml-3 pl-3 border-l-2 border-emerald-500 space-y-4">
                  <div className="flex items-start gap-3 -ml-[19px]">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">2. Accepted by Vendor</p>
                      <p className="text-[11px] text-slate-500">10:16 AM • QuickPrint Corner</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 -ml-[19px]">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs animate-pulse">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700">3. Printing in Progress</p>
                      <p className="text-[11px] text-slate-500">18 pages • B&W • Duplex</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 -ml-[19px] opacity-40">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 text-xs">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">4. Ready for Collection</p>
                      <p className="text-[11px] text-slate-500">Estimated 10:25 AM</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor & Token Card Footer */}
              <div className="pt-4 border-t border-slate-100 bg-slate-50 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 rounded-b-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-semibold text-slate-900 block">QuickPrint Corner</span>
                    <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3" /> Ground Floor, Academic Block 2
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Token</span>
                  <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    CP-2084
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
