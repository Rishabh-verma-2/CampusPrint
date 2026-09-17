import React from 'react';
import { Link } from 'react-router-dom';
import {
  Printer,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Wifi,
} from 'lucide-react';

export const VendorSection: React.FC = () => {
  return (
    <section id="vendors" className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Column: Vendor Value Proposition */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase bg-blue-50 border border-blue-100 px-2.5 py-1 rounded">
                Vendor Operations
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mt-3">
                For campus stationery & printing vendors
              </h2>
              <p className="text-base text-slate-600 mt-3 leading-relaxed">
                Manage incoming print orders, process jobs efficiently, and keep track of your business from one place. Eliminate manual slips, chaotic phone queues, and uncollected printouts.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <span><strong>Single live queue:</strong> See incoming jobs with exact page, color, and duplex specifications.</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <span><strong>Zero unpaid prints:</strong> Every submitted print job is already paid and verified online.</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <span><strong>Fast pickup verification:</strong> Simply enter or scan the student's token to hand over prints.</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <span><strong>Full pricing control:</strong> Update your per-page rates for B&W and color anytime.</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/login?role=vendor"
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
              >
                <span>Vendor Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Realistic Vendor Dashboard Preview */}
          <div className="lg:col-span-7">
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              
              {/* Dashboard Top Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">QuickPrint Express</h4>
                    <span className="text-[11px] text-slate-500">Live Station Terminal</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Accepting Orders
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-blue-600" /> Online
                  </span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg">
                  <span className="text-slate-500 block text-[11px]">Today</span>
                  <span className="font-bold text-slate-900 text-sm">48</span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg">
                  <span className="text-amber-600 block text-[11px] font-medium">Pending</span>
                  <span className="font-bold text-slate-900 text-sm">3</span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg">
                  <span className="text-blue-600 block text-[11px] font-medium">Printing</span>
                  <span className="font-bold text-slate-900 text-sm">2</span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg">
                  <span className="text-emerald-600 block text-[11px] font-medium">Ready</span>
                  <span className="font-bold text-slate-900 text-sm">5</span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg col-span-2 sm:col-span-1">
                  <span className="text-slate-500 block text-[11px]">Revenue</span>
                  <span className="font-bold text-emerald-700 text-sm">₹1,840</span>
                </div>
              </div>

              {/* Order Queue Table Preview */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Current Queue (3 active)</span>
                  <span className="text-blue-600 cursor-pointer hover:underline">Auto-refresh: On</span>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {/* Queue Item 1 */}
                  <div className="p-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          CP-1048
                        </span>
                        <span className="font-semibold text-slate-800 truncate max-w-[140px] sm:max-w-xs">
                          Operating Systems.pdf
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">12 pages • B&W • Duplex • 1 copy</p>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-semibold text-slate-900">₹24</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ready
                      </span>
                    </div>
                  </div>

                  {/* Queue Item 2 */}
                  <div className="p-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          CP-1049
                        </span>
                        <span className="font-semibold text-slate-800 truncate max-w-[140px] sm:max-w-xs">
                          Physics Lab Manual.pdf
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">34 pages • Color • 2 copies</p>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-semibold text-slate-900">₹408</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Printing
                      </span>
                    </div>
                  </div>

                  {/* Queue Item 3 */}
                  <div className="p-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          CP-1050
                        </span>
                        <span className="font-semibold text-slate-800 truncate max-w-[140px] sm:max-w-xs">
                          Resume_Final.pdf
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">2 pages • B&W • 3 copies</p>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-semibold text-slate-900">₹6</span>
                      <button className="px-2.5 py-1 rounded bg-blue-600 text-white font-medium text-[11px] hover:bg-blue-700">
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
