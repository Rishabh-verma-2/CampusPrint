import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Calculator,
  Layers,
  Palette,
} from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { Spinner } from '../../components/ui';
import { toast } from 'sonner';

const VendorPricingPage: React.FC = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [bw, setBw] = useState<number>(1);
  const [color, setColor] = useState<number>(5);
  const [duplexDiscount, setDuplexDiscount] = useState<number>(0);

  // Calculator state
  const [calcPages, setCalcPages] = useState<number>(10);
  const [calcCopies, setCalcCopies] = useState<number>(1);
  const [calcType, setCalcType] = useState<'BW' | 'COLOR'>('BW');
  const [calcSides, setCalcSides] = useState<'SINGLE' | 'DOUBLE'>('SINGLE');

  const { data, isLoading } = useQuery({
    queryKey: ['vendorDashboard'],
    queryFn: () => vendorApi.getDashboard().then((r) => r.data.data),
  });

  useEffect(() => {
    const p = (data as any)?.vendor?.pricing;
    if (p) {
      if (typeof p.bwPerPage === 'number') setBw(p.bwPerPage);
      if (typeof p.colorPerPage === 'number') setColor(p.colorPerPage);
      if (typeof p.duplexDiscount === 'number') setDuplexDiscount(p.duplexDiscount);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      vendorApi.updatePricing({
        bwPerPage: bw,
        colorPerPage: color,
        duplexDiscount: duplexDiscount,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendorDashboard'] });
      setEditing(false);
      toast.success('Printing rates successfully updated');
    },
    onError: () => toast.error('Failed to update pricing rates'),
  });

  // Calculate live preview estimate
  const baseRate = calcType === 'BW' ? bw : color;
  const sheets = calcSides === 'DOUBLE' ? Math.ceil(calcPages / 2) : calcPages;
  const rawTotal = calcPages * baseRate * calcCopies;
  const discountTotal = calcSides === 'DOUBLE' ? sheets * duplexDiscount * calcCopies : 0;
  const estimatedPrice = Math.max(0, rawTotal - discountTotal);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-left pb-12">
      {/* ─── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Print Pricing & Rates
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Configure per-page pricing for Black & White, Color prints, and duplex discount.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs transition-colors"
                id="save-pricing-btn"
              >
                {mutation.isPending ? <Spinner size="sm" /> : <Save size={15} />}
                <span>Save Rates</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs transition-colors"
              id="edit-pricing-btn"
            >
              <span>Edit Rates</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Pricing Cards Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Black & White */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Printer size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Per Page
            </span>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">Black & White</h2>
            <p className="text-xs text-slate-500 mt-0.5">Standard monochrome printing</p>
          </div>

          <div className="pt-2">
            {editing ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-400">₹</span>
                <input
                  id="bw-price"
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={bw}
                  onChange={(e) => setBw(parseFloat(e.target.value) || 0)}
                  className="w-full py-2 px-3 text-lg font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-mono text-center"
                />
              </div>
            ) : (
              <div className="text-3xl font-extrabold text-slate-900 font-mono">₹{bw.toFixed(2)}</div>
            )}
          </div>
        </div>

        {/* Color */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Palette size={20} />
            </div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Per Page
            </span>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">Color Print</h2>
            <p className="text-xs text-slate-500 mt-0.5">Full color graphic prints</p>
          </div>

          <div className="pt-2">
            {editing ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-400">₹</span>
                <input
                  id="color-price"
                  type="number"
                  min={1}
                  step={0.5}
                  value={color}
                  onChange={(e) => setColor(parseFloat(e.target.value) || 0)}
                  className="w-full py-2 px-3 text-lg font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-mono text-center"
                />
              </div>
            ) : (
              <div className="text-3xl font-extrabold text-purple-600 font-mono">
                ₹{color.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Duplex Discount */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Per Sheet
            </span>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">Duplex Discount</h2>
            <p className="text-xs text-slate-500 mt-0.5">Discount on double-sided sheets</p>
          </div>

          <div className="pt-2">
            {editing ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-400">₹</span>
                <input
                  id="duplex-discount"
                  type="number"
                  min={0}
                  step={0.1}
                  value={duplexDiscount}
                  onChange={(e) => setDuplexDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full py-2 px-3 text-lg font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-mono text-center"
                />
              </div>
            ) : (
              <div className="text-3xl font-extrabold text-emerald-600 font-mono">
                ₹{duplexDiscount.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Informational Alert ─────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <span className="font-bold">Important Notice:</span> When you modify your rates, the new
          pricing applies immediately to all future incoming orders. Existing print jobs already in
          queue maintain their original paid price.
        </div>
      </div>

      {/* ─── Live Price Estimation Calculator ────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calculator size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Live Rate Simulator</h2>
            <p className="text-xs text-slate-500">Test your pricing before confirming rates</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Print Color</label>
            <select
              value={calcType}
              onChange={(e) => setCalcType(e.target.value as any)}
              className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 bg-slate-50"
            >
              <option value="BW">Black & White (₹{bw})</option>
              <option value="COLOR">Color (₹{color})</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sides</label>
            <select
              value={calcSides}
              onChange={(e) => setCalcSides(e.target.value as any)}
              className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 bg-slate-50"
            >
              <option value="SINGLE">Single-sided</option>
              <option value="DOUBLE">Double-sided (Duplex)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pages</label>
            <input
              type="number"
              min={1}
              value={calcPages}
              onChange={(e) => setCalcPages(parseInt(e.target.value) || 1)}
              className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Copies</label>
            <input
              type="number"
              min={1}
              value={calcCopies}
              onChange={(e) => setCalcCopies(parseInt(e.target.value) || 1)}
              className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Estimated Student Price</div>
            <div className="text-xs text-slate-400">
              {calcPages} pages ({calcSides === 'DOUBLE' ? `${sheets} sheets duplex` : `${sheets} sheets single`}) × {calcCopies} copy(s)
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-600 font-mono">
            ₹{estimatedPrice.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPricingPage;
