import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
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
  HelpCircle,
  Loader2,
  Download,
  Eye,
  Scissors,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { documentApi } from '../../api/documentApi';
import { vendorApi } from '../../api/vendorApi';
import { printJobApi } from '../../api/printJobApi';
import { useAuth } from '../../context/AuthContext';
import { AvailabilityBadge, Spinner } from '../ui';
import type { DocumentFile, Vendor, PrintJob, ColorMode, SidesMode } from '../../types';

interface NewPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (job: PrintJob) => void;
}

type StepKey = 'upload' | 'store' | 'settings' | 'review' | 'queue';

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
  { key: 'queue', label: 'Queue', number: 5 },
];

export const NewPrintModal: React.FC<NewPrintModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
}) => {
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

  // Step 4 & 5: Submission & Success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<PrintJob | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Custom Range Preview State
  const [isProcessingRange, setIsProcessingRange] = useState(false);
  const [processedPdfUrl, setProcessedPdfUrl] = useState<string | null>(null);
  const [processedPdfName, setProcessedPdfName] = useState<string>('');
  const [processedPageCount, setProcessedPageCount] = useState<number>(0);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);

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
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const vendors: Vendor[] = vendorsData || [];

  // Cleanup blob URLs when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (processedPdfUrl) URL.revokeObjectURL(processedPdfUrl);
    };
  }, [processedPdfUrl]);

  // Reset modal state when closed or opened fresh
  const handleModalClose = () => {
    if (isSubmitting) return; // Prevent closing while sending request
    onClose();
    // After transition, reset
    setTimeout(() => {
      setCurrentStep('upload');
      setDocuments([]);
      setInFlight([]);
      setSelectedVendor(null);
      setColorMode('BW');
      setSides('SINGLE');
      setCopies(1);
      setPageMode('all');
      setCustomPages('');
      setOrientation('AUTO');
      setCreatedJob(null);
      setCopiedToken(false);
      if (processedPdfUrl) URL.revokeObjectURL(processedPdfUrl);
      setProcessedPdfUrl(null);
      setProcessedPdfName('');
      setProcessedPageCount(0);
    }, 200);
  };

  // ─── Parse Custom Range String ───────────────────────────────────────────────
  const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
    const seen = new Set<number>();
    const parts = rangeStr.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [rawStart, rawEnd] = part.split('-').map(Number);
        const start = Math.max(1, rawStart);
        const end = Math.min(totalPages, rawEnd);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) seen.add(i);
        }
      } else {
        const num = Number(part);
        if (!isNaN(num) && num >= 1 && num <= totalPages) seen.add(num);
      }
    }
    return Array.from(seen).sort((a, b) => a - b);
  };

  // ─── Apply Custom Range: Extract pages using pdf-lib ────────────────────────
  const applyCustomRange = async () => {
    if (!documents[0] || !customPages.trim()) {
      toast.error('Please enter a page range first');
      return;
    }

    const doc = documents[0];
    const totalPages = doc.pageCount || 1;
    const pages = parsePageRange(customPages, totalPages);

    if (pages.length === 0) {
      toast.error(`No valid pages found. Document has ${totalPages} pages.`);
      return;
    }

    setIsProcessingRange(true);
    try {
      // Fetch raw PDF bytes through the authenticated API endpoint
      const response = await (await import('../../api/apiClient')).default.get(
        `/documents/${doc._id}/download`,
        { responseType: 'arraybuffer' }
      );
      const arrayBuffer = response.data as ArrayBuffer;

      // Use pdf-lib to create a new PDF with only selected pages
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      // pdf-lib uses 0-based index
      const pageIndices = pages.map((p) => p - 1);
      const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
      for (const page of copiedPages) {
        newPdf.addPage(page);
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

      if (processedPdfUrl) URL.revokeObjectURL(processedPdfUrl);

      const blobUrl = URL.createObjectURL(blob);
      setProcessedPdfUrl(blobUrl);
      setProcessedPdfName(doc.originalName);
      setProcessedPageCount(pages.length);

      toast.success(`Preview ready — ${pages.length} page${pages.length > 1 ? 's' : ''} extracted`);
    } catch (err: any) {
      console.error('PDF processing error:', err);
      toast.error(err?.message || 'Failed to process PDF. Please try again.');
    } finally {
      setIsProcessingRange(false);
    }
  };

  // ─── Document Upload Handlers ────────────────────────────────────────────────
  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    const validFiles: File[] = [];

    for (const f of fileList) {
      if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
        toast.error(`"${f.name}" is not a PDF file. Only PDFs are supported.`);
        continue;
      }
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 20MB limit.`);
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
      // Reset input value so re-uploading same file works if needed
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
        let count = 0;
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
        count = seen.size;
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
  const platformFee = 2; // Flat platform fee
  const estimatedTotal = subtotal + platformFee;

  // ─── Submission Handler ─────────────────────────────────────────────────────
  const handleSubmitJob = async () => {
    if (!selectedVendor) {
      toast.error('Please select a printing store first');
      return;
    }
    if (documents.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setIsSubmitting(true);
    try {
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
      if (onJobCreated) onJobCreated(job);

      toast.success('Print job submitted successfully!');
      setCurrentStep('queue');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create print job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (!createdJob?.publicToken) return;
    navigator.clipboard.writeText(createdJob.publicToken);
    setCopiedToken(true);
    toast.success('Pickup token copied to clipboard!');
    setTimeout(() => setCopiedToken(false), 2500);
  };

  if (!isOpen) return null;

  // Step indicator helper
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && currentStep !== 'queue') {
          handleModalClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-scale-in text-slate-800">
        
        {/* ─── MODAL HEADER ───────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="text-left">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              New Print Job
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Printing as:{' '}
              <span className="font-semibold text-slate-700">
                {user?.name || 'Student'}
              </span>{' '}
              ({user?.enrollmentNumber || user?.phone || 'University ID'})
            </p>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── STEP PROGRESS BAR ──────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {STEPS.map((step, idx) => {
              const isPast = idx < stepIndex;
              const isCurrent = idx === stepIndex;

              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        isPast
                          ? 'bg-blue-600 text-white'
                          : isCurrent
                          ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-600 font-bold'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPast ? <Check size={14} strokeWidth={2.5} /> : step.number}
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-medium ${
                        isCurrent ? 'text-blue-700 font-bold' : isPast ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-7 sm:w-12 h-0.5 mx-1.5 -mt-3.5 transition-colors ${
                        idx < stepIndex ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── MODAL BODY CONTAINER ───────────────────────────────────────── */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-left">

          {/* ================================================================ */}
          {/* STEP 1: UPLOAD                                                   */}
          {/* ================================================================ */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Upload PDF Documents
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Select one or more PDF files to print (max 20MB per file).
                </p>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
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
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <Loader2 size={24} className="animate-spin text-blue-600" />
                    </div>
                    <div className="font-semibold text-blue-700 text-sm">
                      Uploading {inFlight.length} document{inFlight.length > 1 ? 's' : ''}...
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Processing pages & securing in cloud storage. Please wait...
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <UploadCloud size={24} />
                    </div>
                    <div className="font-semibold text-slate-800 text-sm">
                      Click to upload or drag & drop files
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Supported format: PDF only • Up to 20MB
                    </div>
                  </>
                )}
              </div>

              {/* Uploaded Documents List */}
              {(documents.length > 0 || inFlight.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Uploaded Files ({documents.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Add another document</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {/* Finished Documents */}
                    {documents.map((doc) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                              {doc.originalName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB • {doc.pageCount || 1}{' '}
                              {doc.pageCount === 1 ? 'page' : 'pages'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeDocument(doc._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
                        className="p-3 rounded-lg border border-blue-200/80 bg-blue-50/40 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <Loader2 size={14} className="animate-spin text-blue-600 flex-shrink-0" />
                            <span className="font-medium text-slate-700 truncate max-w-[180px] sm:max-w-[240px]">
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
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 2: STORE SELECTION                                          */}
          {/* ================================================================ */}
          {currentStep === 'store' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Select Printing Store
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Choose a verified campus vendor to handle your print job.
                </p>
              </div>

              {isLoadingVendors || isRefetchingVendors ? (
                <div className="space-y-3 py-4">
                  <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-center gap-3">
                    <Spinner size="sm" className="text-blue-600" />
                    <span className="text-xs text-slate-500">Checking campus print stores...</span>
                  </div>
                </div>
              ) : vendors.length === 0 || vendorsError ? (
                /* Strict Zero-Vendor Empty State */
                <div className="p-6 sm:p-8 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No printing stores are currently available.
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Please check back later or contact campus support. All stores may currently be offline or inactive.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() => refetchVendors()}
                      className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors text-slate-700"
                    >
                      <RefreshCw size={14} className={isRefetchingVendors ? 'animate-spin' : ''} />
                      <span>Refresh Stores</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Store List */
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
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
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer text-left ${
                          !isOpenStore
                            ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900">
                                {vendor.shopName}
                              </span>
                              <AvailabilityBadge availability={vendor.availability} />
                            </div>
                            <p className="text-xs text-slate-500 truncate">
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
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 3: PRINT SETTINGS                                           */}
          {/* ================================================================ */}
          {currentStep === 'settings' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Print Configuration
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Customize color, double-sided printing, and copy count.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Color Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Color Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setColorMode('BW')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
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
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Sides
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSides('SINGLE')}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
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
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Number of Copies
                  </label>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.max(1, c - 1))}
                      disabled={copies <= 1}
                      className="px-3.5 py-2 hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-sm text-slate-900">
                      {copies}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.min(50, c + 1))}
                      disabled={copies >= 50}
                      className="px-3.5 py-2 hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Paper Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Paper Size
                  </label>
                  <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>A4 (Standard)</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      210 × 297 mm
                    </span>
                  </div>
                </div>
              </div>

              {/* Page Range Selection */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Page Selection
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPageMode('all');
                      setCustomPages('');
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
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
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      pageMode === 'custom'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>

                {pageMode === 'custom' && (
                  <div className="mt-3 space-y-3">
                    {/* Input + Apply Row */}
                    <div className="flex gap-2 items-stretch">
                      <div className="relative flex-1">
                        <Scissors className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="e.g. 1-4, 6, 7"
                          value={customPages}
                          onChange={(e) => {
                            setCustomPages(e.target.value);
                            // Clear preview when user edits
                            if (processedPdfUrl) {
                              URL.revokeObjectURL(processedPdfUrl);
                              setProcessedPdfUrl(null);
                            }
                          }}
                          className="w-full pl-8 pr-3 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyCustomRange}
                        disabled={isProcessingRange || !customPages.trim() || documents.length !== 1}
                        className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-xs"
                      >
                        {isProcessingRange ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Eye size={13} />
                            <span>Apply</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Enter page numbers or ranges separated by commas — e.g. <span className="font-mono text-slate-500">1-4, 6, 7</span>
                      {documents.length === 1 && documents[0].pageCount ? (
                        <span className="ml-1 text-slate-400">(Doc has {documents[0].pageCount} pages)</span>
                      ) : null}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 size={14} className="flex-shrink-0 text-emerald-600" />
                      <span>
                        The vendor will receive an <strong>updated custom PDF</strong> containing only your selected pages, not your original full document.
                      </span>
                    </div>

                    {/* Compact Result Card */}
                    {processedPdfUrl && (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {processedPdfName}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                            ✓ {processedPageCount} page{processedPageCount !== 1 ? 's' : ''} extracted
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowPdfPreviewModal(true)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors shadow-xs"
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </button>
                          <a
                            href={processedPdfUrl}
                            download={processedPdfName}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors shadow-xs"
                          >
                            <Download size={11} />
                            <span>Save</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Processing overlay hint */}
                    {isProcessingRange && (
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-100 bg-blue-50/60">
                        <Loader2 size={14} className="animate-spin text-blue-600 flex-shrink-0" />
                        <p className="text-xs text-blue-700 font-medium">
                          Extracting pages from your PDF — this may take a moment...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Price Estimation Box */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Live Price Estimate
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Pages</span>
                    <span className="font-semibold text-slate-800">
                      {totalPagesToPrint} pages × {copies}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Rate</span>
                    <span className="font-semibold text-slate-800">
                      ₹{ratePerPage}/sheet
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Platform Fee</span>
                    <span className="font-semibold text-slate-800">₹{platformFee}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Estimated Total</span>
                    <span className="font-bold text-blue-700 text-sm">₹{estimatedTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 4: REVIEW                                                   */}
          {/* ================================================================ */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Review Your Print Job
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Confirm your details before sending the job directly to the store queue.
                </p>
              </div>

              {/* Review Card */}
              <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white space-y-4 shadow-xs">
                {/* Student Info */}
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Student</span>
                  <span className="font-semibold text-slate-900">
                    {user?.name} ({user?.enrollmentNumber || user?.phone || 'University ID'})
                  </span>
                </div>

                {/* Selected Store */}
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Store</span>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900 block">
                      {selectedVendor?.shopName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedVendor?.address}
                    </span>
                  </div>
                </div>

                {/* Documents */}
                <div className="pb-3 border-b border-slate-100 text-xs space-y-1.5">
                  <span className="text-slate-500 block">Documents ({documents.length})</span>
                  {documents.map((doc) => (
                    <div key={doc._id} className="flex items-center justify-between text-slate-800">
                      <span className="truncate max-w-[240px] font-medium">• {doc.originalName}</span>
                      <span className="text-slate-400">{doc.pageCount || 1} pages</span>
                    </div>
                  ))}
                </div>

                {/* Print Configuration Details */}
                <div className="pb-3 border-b border-slate-100 text-xs space-y-1">
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
                    <span>Total Sheets to Print:</span>
                    <span className="font-semibold text-slate-800">{totalSheets} sheets</span>
                  </div>
                </div>

                {/* Estimated Cost */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Estimated Cost
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Includes ₹{platformFee} platform fee
                    </span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    ₹{estimatedTotal}
                  </span>
                </div>
              </div>

              {/* Clear notice */}
              <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/60 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  No online payment required right now. Your order will go directly to the vendor's print queue. You can collect it from the store when ready.
                </p>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 5: QUEUED / SUCCESS                                         */}
          {/* ================================================================ */}
          {currentStep === 'queue' && createdJob && (
            <div className="py-4 text-center space-y-5 animate-fade-in">
              {/* Checkmark */}
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto border border-green-100 shadow-xs">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Print Job Placed Successfully!
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Your job has been dispatched to {selectedVendor?.shopName || 'the vendor'}.
                </p>
              </div>

              {/* Prominent Token Display */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-sm mx-auto space-y-2">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  Pickup Token
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-3xl font-extrabold text-blue-600 tracking-wider">
                    {createdJob.publicToken}
                  </span>
                  <button
                    type="button"
                    onClick={copyTokenToClipboard}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Copy Token"
                  >
                    {copiedToken ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  </button>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Waiting in Queue
                  </span>
                </div>
              </div>

              {/* Details Summary */}
              <div className="max-w-sm mx-auto text-xs text-slate-500 space-y-1 text-left bg-white p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between">
                  <span>Store:</span>
                  <span className="font-semibold text-slate-700">{selectedVendor?.shopName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Documents:</span>
                  <span className="font-semibold text-slate-700">
                    {documents.length} {documents.length === 1 ? 'file' : 'files'}, {totalPagesToPrint} pages
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Time:</span>
                  <span className="font-semibold text-slate-700">Usually ready in 5-10 mins</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── MODAL FOOTER / ACTIONS ─────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          {/* Step 1: Upload Footer */}
          {currentStep === 'upload' && (
            <>
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={documents.length === 0 || inFlight.length > 0}
                onClick={() => setCurrentStep('store')}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
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
            </>
          )}

          {/* Step 2: Store Footer */}
          {currentStep === 'store' && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedVendor || selectedVendor.availability !== 'OPEN'}
                onClick={() => setCurrentStep('settings')}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Continue to Settings</span>
                <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* Step 3: Settings Footer */}
          {currentStep === 'settings' && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep('store')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('review')}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Continue to Review</span>
                <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* Step 4: Review Footer */}
          {currentStep === 'review' && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCurrentStep('settings')}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitJob}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Print Job</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </>
          )}

          {/* Step 5: Queue Footer */}
          {currentStep === 'queue' && createdJob && (
            <div className="w-full flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleModalClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  handleModalClose();
                  navigate(`/student/orders/${createdJob._id}`);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Track Print Job</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ─── PDF Preview Modal (portal — renders above everything) ─────────── */}
        {showPdfPreviewModal && processedPdfUrl && createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/85 flex flex-col"
            style={{ animation: 'fadeIn 0.2s ease' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <FileText size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[260px]">
                    {processedPdfName}
                  </p>
                  <p className="text-[10px] text-blue-600 font-semibold">
                    {processedPageCount} page{processedPageCount !== 1 ? 's' : ''} · Custom range
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={processedPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  title="Open full PDF in new tab"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Open in Tab</span>
                </a>
                <a
                  href={processedPdfUrl}
                  download={processedPdfName}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Save PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPdfPreviewModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {/* PDF iframe */}
            <div className="flex-1 overflow-hidden relative bg-slate-800">
              <iframe
                src={processedPdfUrl}
                title={processedPdfName}
                className="w-full h-full border-0"
              />
            </div>
            {/* Mobile helper notice */}
            <div className="sm:hidden px-3 py-2 bg-slate-900/90 text-center text-[11px] text-slate-300 flex items-center justify-center gap-2">
              <span>Viewing on phone?</span>
              <a
                href={processedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline font-semibold flex items-center gap-1"
              >
                Open in Browser <ExternalLink size={11} />
              </a>
            </div>
          </div>,
          document.body
        )}

      </div>
    </div>
  );
};
