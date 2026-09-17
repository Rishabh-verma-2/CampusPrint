import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  Upload,
  Settings,
  CreditCard,
  Hash,
  Store,
  MapPin,
  Clock,
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40 pt-12 pb-16 lg:pt-16 lg:pb-20 border-b border-slate-200/80">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold tracking-wide">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span>Fast Campus Printing • No Wait Times</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Print college documents, <span className="text-blue-600">skip the counter queue.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Upload your PDF from your phone or laptop, customize your copies, and pick up your prints from the campus stationery shop with a simple 4-digit number.
            </p>

            {/* Quick Benefits Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Fast 2-field login (Name + ID)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Instant simple 4-digit token</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>No flash drives or paper slips</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Direct counter collection</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                to="/login"
                className="px-7 py-3.5 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                id="hero-start-print-btn"
              >
                <span>Start Printing Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="px-6 py-3.5 text-base font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>See How It Works</span>
              </a>
            </div>

            {/* 4-Stage Mini Stepper */}
            <div className="pt-4 border-t border-slate-200/80">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Print Journey
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-600 overflow-x-auto pb-1">
                <span className="flex items-center gap-1 font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  1. Upload
                </span>
                <span className="text-slate-300 font-bold">→</span>
                <span className="flex items-center gap-1 font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  <Settings className="w-3.5 h-3.5 text-blue-600" />
                  2. Options
                </span>
                <span className="text-slate-300 font-bold">→</span>
                <span className="flex items-center gap-1 font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  3. Pay
                </span>
                <span className="text-slate-300 font-bold">→</span>
                <span className="flex items-center gap-1 font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  4. Collect
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Product UI Mockup */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-lg shadow-slate-200/50 relative">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="ml-2 text-xs font-semibold text-slate-600">Active Campus Order</span>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ready for Pickup
                </span>
              </div>

              {/* Order Card Container */}
              <div className="mt-4 space-y-4">

                {/* Student Customer Badge */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Student Customer</span>
                    <span className="font-bold text-slate-900 text-sm">Aarav Sharma</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-medium block">Enrollment No.</span>
                    <span className="font-mono font-semibold text-slate-700">2403031461100</span>
                  </div>
                </div>

                {/* File Details */}
                <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        Operating_Systems_Assignment.pdf
                      </h4>
                      <span className="text-[11px] font-bold bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded flex-shrink-0">
                        B&W
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      12 pages • Double-sided • 1 copy • ₹24
                    </p>
                  </div>
                </div>

                {/* Shop Location */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Store className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">Campus QuickPrint</span>
                      <span className="text-slate-400 block flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Ground Floor, Library Block
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" /> Printed & Packed
                    </span>
                  </div>
                </div>

                {/* Simple Pure Numeric Token Banner */}
                <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider block">
                      Pickup Number
                    </span>
                    <span className="text-3xl font-extrabold tracking-wider font-mono">
                      1048
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-blue-100 block">
                      Tell this number at counter
                    </span>
                    <span className="text-[11px] text-blue-200 mt-0.5 block">
                      Zero paperwork required
                    </span>
                  </div>
                </div>

              </div>

              {/* Card Footer Guarantee */}
              <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-slate-400">
                <span>Verified by Campus Stationers</span>
                <span>Payment settled online</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
