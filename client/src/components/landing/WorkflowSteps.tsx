import React from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  Sliders,
  CreditCard,
  Store,
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Zap,
} from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: UploadCloud,
    title: 'Upload Document',
    tag: 'Mobile & Laptop',
    description: 'Select your PDF or coursework file. Your pages are verified automatically.',
    widget: {
      label: 'Assignment_Final.pdf',
      sub: '12 pages • Verified PDF',
      badge: 'Ready',
    },
    accent: 'from-blue-600 to-cyan-500',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    num: '02',
    icon: Sliders,
    title: 'Choose Options',
    tag: 'Live Pricing',
    description: 'Select Black & White or Color, single or double-sided, and number of copies.',
    widget: {
      label: 'B&W • Double-sided',
      sub: '1 copy • Total ₹24',
      badge: 'Live Quote',
    },
    accent: 'from-indigo-600 to-blue-500',
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  {
    num: '03',
    icon: CreditCard,
    title: 'Pay Online',
    tag: 'Zero Queues',
    description: 'Pay securely via UPI (GPay, PhonePe, Paytm) or card with instant confirmation.',
    widget: {
      label: 'UPI / Cards / Wallets',
      sub: 'Instant digital receipt',
      badge: 'Secure',
    },
    accent: 'from-violet-600 to-indigo-500',
    iconBg: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    num: '04',
    icon: Store,
    title: 'Collect Prints',
    tag: 'Simple 4-Digit Number',
    description: 'Receive your unique pickup number and collect your printed pages at the shop counter.',
    widget: {
      label: 'Pickup Number: 1048',
      sub: 'Ready at counter',
      badge: 'Instant Handover',
    },
    accent: 'from-emerald-600 to-teal-500',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
];

export const WorkflowSteps: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-b from-white via-slate-50/50 to-white relative overflow-hidden">
      {/* Subtle Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide uppercase shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Fast Campus Workflow</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-3.5">
            How CampusPrint Works
          </h2>

          <p className="text-base text-slate-600 mt-2.5 leading-relaxed">
            From submitting your file to picking up your printed document at the stationery shop in under 5 minutes.
          </p>
        </div>

        {/* Enhanced Steps Grid with Flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="group relative bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5"
              >
                {/* Top Row: Icon + Step Badge */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${step.iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                      STEP {step.num}
                    </span>
                  </div>

                  <div className="inline-block mb-1.5">
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      {step.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Bottom Interactive Preview Widget */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-2 group-hover:bg-blue-50/40 group-hover:border-blue-100 transition-colors">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {step.widget.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {step.widget.sub}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {step.widget.badge}
                    </span>
                  </div>
                </div>

                {/* Decorative Step Connecting Indicator for Desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center shadow-xs">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Enhanced Bottom Action Area */}
        <div className="mt-14 text-center">
          <div className="inline-flex flex-col items-center">
            <Link
              to="/login"
              className="px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md hover:shadow-xl transition-all flex items-center gap-2 group"
              id="workflow-start-print-btn"
            >
              <span>Start Printing Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                2-field login (Name + ID)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Zero passwords needed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Works right in your phone browser
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
