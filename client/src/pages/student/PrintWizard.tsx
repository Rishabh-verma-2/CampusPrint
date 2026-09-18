import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  Store,
  Settings2,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Trash2,
  FileText,
  Plus,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { documentApi } from '../../api/documentApi';
import { vendorApi } from '../../api/vendorApi';
import { printJobApi } from '../../api/printJobApi';
import { paymentApi } from '../../api/paymentApi';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { AvailabilityBadge, Spinner } from '../../components/ui';
import type { DocumentFile, Vendor, PrintJob, ColorMode, SidesMode } from '../../types';

type StepKey = 'upload' | 'store' | 'settings' | 'review' | 'payment';

type PaymentState = 'idle' | 'creating_job' | 'creating_order' | 'checkout' | 'verifying' | 'success' | 'failed' | 'dropped';

interface InFlightUpload {
  id: string;
  name: string;
  progress: number;
  statusText?: string;
}

const STEPS: { key: StepKey; label: string; number: number }[] = [
  { key: 'upload', label: 'Upload', number: 1 },
  { key: 'store', label: 'Store', number: 2 },
  { key: 'settings', label: 'Settings', number: 3 },
  { key: 'review', label: 'Review', number: 4 },
  { key: 'payment', label: 'Pay', number: 5 },
];

const PrintWizardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Navigation & Flow State
  const [currentStep, setCurrentStep] = useState<StepKey>('upload');

  // Step 1: Uploads
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [inFlight, setInFlight] = useState<InFlightUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Store
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Step 3: Print Settings
  const [colorMode, setColorMode] = useState<ColorMode>('BW');
  const [sides, setSides] = useState<SidesMode>('SINGLE');
  const [copies, setCopies] = useState<number>(1);
  const [pageMode, setPageMode] = useState<'all' | 'custom'>('all');
  const [customPages, setCustomPages] = useState<string>('');
  const [orientation, setOrientation] = useState<'AUTO' | 'PORTRAIT' | 'LANDSCAPE'>('AUTO');

  // Step 4 & 5: Submission & Payment
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<PrintJob | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paidJobToken, setPaidJobToken] = useState<string | null>(null);
  const [paidJobId, setPaidJobId] = useState<string | null>(null);

  // ─── Real Backend Vendors Query ─────────────────────────────────────────────
  const {
    data: vendorsData,
    isLoading: isLoadingVendors,
    isRefetching: isRefetchingVendors,
    refetch: refetchVendors,
    error: vendorsError,
  } = useQuery({
    queryKey: ['activeVendors'],
    queryFn: () => vendorApi.getVendors().then((res) => res.data.data.vendors),
    staleTime: 60 * 1000,
  });

  const { data: publicSettings } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => apiClient.get('/settings').then((res) => res.data.data.settings),
    staleTime: 30 * 1000,
  });

  const vendors: Vendor[] = vendorsData || [];
  const dynamicPlatformFee = publicSettings?.platformFee ?? 2;
  const maxFileSizeMb = publicSettings?.maxFileSizeMb ?? 25;
  const maxPagesLimit = publicSettings?.maxPagesLimit ?? 200;

  // ─── Document Upload Handlers ────────────────────────────────────────────────
  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    const validFiles: File[] = [];

    for (const f of fileList) {
      if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
        toast.error(`"${f.name}" is not a PDF file. Only PDFs are supported.`);
        continue;
      }
      if (f.size > maxFileSizeMb * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds ${maxFileSizeMb}MB limit.`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    for (const file of validFiles) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      setInFlight((prev) => [
        ...prev,
        { id: tempId, name: file.name, progress: 15, statusText: 'Uploading document...' },
      ]);

      try {
        const res = await documentApi.upload(file, (pct) => {
          setInFlight((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? {
                    ...item,
                    progress: pct >= 100 ? 95 : Math.max(pct, 15),
                    statusText:
                      pct >= 100
                        ? 'Processing & saving to cloud...'
                        : `Uploading ${pct}%...`,
                  }
                : item
            )
          );
        });

        const newDoc = res.data.data.document;
        setDocuments((prev) => [...prev, newDoc]);
        toast.success(`Uploaded ${file.name}`);
      } catch (err: any) {
        toast.error(err.response?.data?.message || `Failed to upload ${file.name}`);
      } finally {
        setInFlight((prev) => prev.filter((item) => item.id !== tempId));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d._id !== docId));
  };

  // ─── Price & Page Calculation Helpers ───────────────────────────────────────
  const calculateTotalDocPages = useCallback((): number => {
    const rawTotal = documents.reduce((acc, doc) => acc + (doc.pageCount || 1), 0);
    if (documents.length === 1 && pageMode === 'custom' && customPages.trim()) {
      try {
        const parts = customPages.split(',').map((s) => s.trim());
        const total = documents[0].pageCount || 1;
        const seen = new Set<number>();
        for (const p of parts) {
          if (p.includes('-')) {
            const [start, end] = p.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= total && start <= end) {
              for (let i = start; i <= end; i++) seen.add(i);
            }
          } else {
            const num = Number(p);
            if (!isNaN(num) && num >= 1 && num <= total) seen.add(num);
          }
        }
        const count = seen.size;
        return count > 0 ? count : rawTotal;
      } catch {
        return rawTotal;
      }
    }
    return rawTotal;
  }, [documents, pageMode, customPages]);

  const totalPagesToPrint = calculateTotalDocPages();
  const effectivePagesPerCopy = sides === 'DOUBLE' ? Math.ceil(totalPagesToPrint / 2) : totalPagesToPrint;
  const totalSheets = effectivePagesPerCopy * copies;

  const ratePerPage = selectedVendor
    ? colorMode === 'COLOR'
      ? selectedVendor.pricing.colorPerPage
      : selectedVendor.pricing.bwPerPage
    : colorMode === 'COLOR'
    ? 5
    : 2;

  const subtotal = totalSheets * ratePerPage;
  const platformFee = dynamicPlatformFee;
  const estimatedTotal = subtotal + platformFee;

  // ─── Submit: Create Job + Initiate Payment ──────────────────────────────────
  const handleSubmitJob = async () => {
    if (!selectedVendor) {
      toast.error('Please select a printing store first');
      return;
    }
    if (documents.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setPaymentState('creating_job');
    setIsSubmitting(true);
    setPaymentError(null);

    try {
      // STEP A: Create the PrintJob (status = PAYMENT_PENDING)
      const pageRanges =
        documents.length === 1 && pageMode === 'custom' && customPages.trim()
          ? customPages.trim()
          : 'all';

      const payload = {
        documentId: documents[0]._id,
        documentIds: documents.map((d) => d._id),
        vendorId: selectedVendor._id,
        printConfig: {
          colorMode,
          sides,
          copies,
          pageRanges,
          totalPages: totalPagesToPrint,
        },
      };

      const res = await printJobApi.create(payload);
      const job = res.data.data.printJob;
      setCreatedJob(job);
      queryClient.invalidateQueries({ queryKey: ['myJobs'] });

      // STEP B: Create Cashfree payment order (amount from server — not trusted from frontend)
      setPaymentState('creating_order');
      const orderRes = await paymentApi.createOrder(job._id);
      const { paymentSessionId, payment } = orderRes.data.data;

      if (!paymentSessionId) {
        throw new Error('No payment session received from server');
      }

      // STEP C: Navigate to payment step then open Cashfree Checkout
      setCurrentStep('payment');
      setPaymentState('checkout');

      // Load Cashfree JS SDK dynamically (sandbox or production)
      const cashfreeMode = 'sandbox'; // Always sandbox for now — change when going live
      await loadCashfreeSDK();

      const cashfree = (window as any).Cashfree({ mode: cashfreeMode });

      // Launch Cashfree Hosted Checkout (UPI only — enforced on backend via order_meta)
      cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_self', // Redirect in same tab to /payment/return
      });

      // After checkout(), the page will redirect to return_url set in the backend.
      // We don't need to handle the result here — PaymentReturnPage does that.

    } catch (err: any) {
      console.error('[Payment] Error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Payment setup failed. Please try again.';
      setPaymentError(errMsg);
      setPaymentState('failed');
      toast.error(errMsg);
      setIsSubmitting(false);
    }
  };

  // ─── Load Cashfree JS SDK (CDN) ─────────────────────────────────────────────
  const loadCashfreeSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Cashfree) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
      document.head.appendChild(script);
    });
  };

  const copyTokenToClipboard = () => {
    if (!createdJob?.publicToken) return;
    navigator.clipboard.writeText(createdJob.publicToken);
    setCopiedToken(true);
    toast.success('Pickup token copied to clipboard!');
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in text-left">
      
      {/* ─── PAGE HEADER & SESSION INFO ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/student"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            New Print Job
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Printing as:{' '}
            <span className="font-semibold text-slate-800">
              {user?.name || 'Student'}
            </span>{' '}
            ({user?.enrollmentNumber || user?.phone || 'University ID'})
          </p>
        </div>

        {currentStep !== 'payment' && (
          <button
            type="button"
            onClick={() => navigate('/student')}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* ─── 5-STEP PROGRESS BAR ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((step, idx) => {
            const isPast = idx < stepIndex;
            const isCurrent = idx === stepIndex;

            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      isPast
                        ? 'bg-blue-600 text-white'
                        : isCurrent
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-600 font-bold'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <Check size={16} strokeWidth={2.5} /> : step.number}
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 font-medium ${
                      isCurrent ? 'text-blue-700 font-bold' : isPast ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-2 -mt-4 transition-colors ${
                      idx < stepIndex ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN CARD CONTAINER ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">

        {/* ================================================================ */}
        {/* STEP 1: UPLOAD                                                   */}
        {/* ================================================================ */}
        {currentStep === 'upload' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Upload PDF Documents
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Select one or more PDF documents to print (up to 20MB per file).
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
              />
              {inFlight.length > 0 ? (
                <div className="py-2">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Loader2 size={28} className="animate-spin text-blue-600" />
                  </div>
                  <div className="font-semibold text-blue-700 text-sm sm:text-base">
                    Uploading {inFlight.length} document{inFlight.length > 1 ? 's' : ''}...
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5">
                    Processing pages & securing in cloud storage. Please wait...
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <UploadCloud size={28} />
                  </div>
                  <div className="font-semibold text-slate-800 text-sm sm:text-base">
                    Click to upload or drag & drop files
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5">
                    Supported format: PDF only • Max 20MB per document
                  </div>
                </>
              )}
            </div>

            {/* Uploaded Documents List */}
            {(documents.length > 0 || inFlight.length > 0) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Uploaded Files ({documents.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add another document</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* Finished Documents */}
                  {documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {doc.originalName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB • {doc.pageCount || 1}{' '}
                            {doc.pageCount === 1 ? 'page' : 'pages'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeDocument(doc._id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  {/* In-Flight Uploads */}
                  {inFlight.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Loader2 size={14} className="animate-spin text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-[280px]">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] text-blue-700 font-medium">
                            {item.statusText || (item.progress >= 95 ? 'Saving to cloud...' : 'Uploading...')}
                          </span>
                          <span className="text-blue-600 font-semibold">{item.progress}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden relative">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                          style={{ width: `${item.progress}%` }}
                        >
                          <div className="absolute inset-0 bg-white/25 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/student')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={documents.length === 0 || inFlight.length > 0}
                onClick={() => setCurrentStep('store')}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {inFlight.length > 0 ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Store</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: STORE SELECTION                                          */}
        {/* ================================================================ */}
        {currentStep === 'store' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Select Printing Store
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Choose an active verified printing store on your campus.
              </p>
            </div>

            {isLoadingVendors || isRefetchingVendors ? (
              <div className="p-8 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-center gap-3">
                <Spinner size="md" className="text-blue-600" />
                <span className="text-sm text-slate-500 font-medium">Checking campus print stores...</span>
              </div>
            ) : vendors.length === 0 || vendorsError ? (
              /* Strict Zero-Vendor Empty State */
              <div className="p-8 sm:p-10 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No printing stores are currently available.
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Please check back later or contact campus support. All stores may currently be offline or inactive.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => refetchVendors()}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors text-slate-700 cursor-pointer"
                  >
                    <RefreshCw size={14} className={isRefetchingVendors ? 'animate-spin' : ''} />
                    <span>Refresh Stores</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Store List */
              <div className="space-y-3">
                {vendors.map((vendor) => {
                  const isOpenStore = vendor.availability === 'OPEN';
                  const isSelected = selectedVendor?._id === vendor._id;

                  return (
                    <div
                      key={vendor._id}
                      onClick={() => {
                        if (isOpenStore) {
                          setSelectedVendor(vendor);
                        } else {
                          toast.error(`${vendor.shopName} is currently ${vendor.availability.toLowerCase()}`);
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                        !isOpenStore
                          ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-slate-900">
                              {vendor.shopName}
                            </span>
                            <AvailabilityBadge availability={vendor.availability} />
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500">
                            {vendor.address || 'Campus Print Hub'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                            <span className="font-semibold text-slate-700">
                              ₹{vendor.pricing?.bwPerPage ?? 2}/page B&W
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              ₹{vendor.pricing?.colorPerPage ?? 5}/page Color
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 pt-0.5">
                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedVendor || selectedVendor.availability !== 'OPEN'}
                onClick={() => setCurrentStep('settings')}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Continue to Settings</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: PRINT SETTINGS                                           */}
        {/* ================================================================ */}
        {currentStep === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Print Configuration
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Customize colors, orientation, and copies for your print order.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Color Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Color Mode
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setColorMode('BW')}
                    className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      colorMode === 'BW'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Black & White
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('COLOR')}
                    className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      colorMode === 'COLOR'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Color
                  </button>
                </div>
              </div>

              {/* Print Sides */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Sides
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSides('SINGLE')}
                    className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      sides === 'SINGLE'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Single-Sided
                  </button>
                  <button
                    type="button"
                    onClick={() => setSides('DOUBLE')}
                    className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      sides === 'DOUBLE'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Double-Sided
                  </button>
                </div>
              </div>

              {/* Copies Stepper */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Number of Copies
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setCopies((c) => Math.max(1, c - 1))}
                    disabled={copies <= 1}
                    className="px-4 py-2.5 hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-sm sm:text-base text-slate-900">
                    {copies}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCopies((c) => Math.min(50, c + 1))}
                    disabled={copies >= 50}
                    className="px-4 py-2.5 hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Paper Size */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Paper Size
                </label>
                <div className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>A4 (Standard)</span>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">
                    210 × 297 mm
                  </span>
                </div>
              </div>
            </div>

            {/* Page Range Selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Page Selection
              </label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPageMode('all');
                    setCustomPages('');
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    pageMode === 'all'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  All Pages ({totalPagesToPrint})
                </button>
                <button
                  type="button"
                  onClick={() => setPageMode('custom')}
                  className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    pageMode === 'custom'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {pageMode === 'custom' && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    placeholder="e.g. 1-3, 5"
                    value={customPages}
                    onChange={(e) => setCustomPages(e.target.value)}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Specify page numbers or ranges separated by commas.
                  </p>
                </div>
              )}
            </div>

            {/* Orientation */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Orientation
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['AUTO', 'PORTRAIT', 'LANDSCAPE'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setOrientation(mode)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                      orientation === mode
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mode.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Price Estimation Box */}
            <div className="p-4 sm:p-5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Live Price Estimate
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Pages</span>
                  <span className="font-semibold text-slate-800">
                    {totalPagesToPrint} pages × {copies}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Rate</span>
                  <span className="font-semibold text-slate-800">
                    ₹{ratePerPage}/sheet
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Platform Fee</span>
                  <span className="font-semibold text-slate-800">₹{platformFee}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Estimated Total</span>
                  <span className="font-bold text-blue-700 text-base">₹{estimatedTotal}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('store')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('review')}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Continue to Review</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 4: REVIEW                                                   */}
        {/* ================================================================ */}
        {currentStep === 'review' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Review Your Print Job
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Confirm your order details before payment.
              </p>
            </div>

            {/* Review Card */}
            <div className="border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50/50 space-y-4 shadow-xs">
              {/* Student Info */}
              <div className="pb-3 border-b border-slate-200/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Student</span>
                <span className="font-semibold text-slate-900">
                  {user?.name} ({user?.enrollmentNumber || user?.phone || 'University ID'})
                </span>
              </div>

              {/* Selected Store */}
              <div className="pb-3 border-b border-slate-200/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Store</span>
                <div className="text-right">
                  <span className="font-semibold text-slate-900 block">
                    {selectedVendor?.shopName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedVendor?.address}
                  </span>
                </div>
              </div>

              {/* Documents */}
              <div className="pb-3 border-b border-slate-200/80 text-xs sm:text-sm space-y-2">
                <span className="text-slate-500 block">Documents ({documents.length})</span>
                {documents.map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between text-slate-800">
                    <span className="truncate max-w-[300px] font-medium">• {doc.originalName}</span>
                    <span className="text-slate-400">{doc.pageCount || 1} pages</span>
                  </div>
                ))}
              </div>

              {/* Print Configuration Details */}
              <div className="pb-3 border-b border-slate-200/80 text-xs sm:text-sm space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Color Mode:</span>
                  <span className="font-semibold text-slate-800">
                    {colorMode === 'COLOR' ? 'Color' : 'Black & White'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sides:</span>
                  <span className="font-semibold text-slate-800">
                    {sides === 'DOUBLE' ? 'Double-Sided' : 'Single-Sided'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Copies:</span>
                  <span className="font-semibold text-slate-800">{copies}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Sheets:</span>
                  <span className="font-semibold text-slate-800">{totalSheets} sheets</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Amount
                  </span>
                  <span className="text-xs text-slate-400 block">
                    Includes ₹{platformFee} platform fee
                  </span>
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  ₹{estimatedTotal}
                </span>
              </div>
            </div>

            {/* UPI payment notice */}
            <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/60 flex items-start gap-3">
              <AlertCircle size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-indigo-800 leading-relaxed">
                You will be taken to a secure UPI payment screen. Your print job will be sent to the vendor only after payment is confirmed.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCurrentStep('settings')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                id="pay-with-upi-btn"
                type="button"
                disabled={isSubmitting || paymentState === 'creating_job' || paymentState === 'creating_order' || paymentState === 'checkout'}
                onClick={handleSubmitJob}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm sm:text-base font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {(paymentState === 'creating_job' || paymentState === 'creating_order') ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{paymentState === 'creating_job' ? 'Creating order...' : 'Preparing payment...'}</span>
                  </>
                ) : paymentState === 'checkout' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Opening checkout...</span>
                  </>
                ) : (
                  <>
                    <span>Pay ₹{estimatedTotal} with UPI</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 5: PAYMENT / PROCESSING                                      */}
        {/* ================================================================ */}
        {currentStep === 'payment' && (
          <div className="py-6 text-center space-y-6 animate-fade-in">
            {paymentState === 'checkout' || paymentState === 'creating_order' || paymentState === 'creating_job' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {paymentState === 'creating_job' ? 'Creating your order...' :
                     paymentState === 'creating_order' ? 'Preparing payment...' :
                     'Opening secure payment...'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {paymentState === 'checkout'
                      ? 'Redirecting to UPI payment. Please do not close this page.'
                      : 'Almost there — setting up your secure payment.'}
                  </p>
                </div>
              </>
            ) : paymentState === 'failed' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Payment Setup Failed</h2>
                  <p className="text-sm text-slate-500 mt-1">{paymentError || 'Something went wrong. Please try again.'}</p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setCurrentStep('review'); setPaymentState('idle'); setPaymentError(null); }}
                    className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Back to Review
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitJob}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
};

export default PrintWizardPage;
