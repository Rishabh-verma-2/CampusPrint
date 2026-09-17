import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowRight, Printer, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { printJobApi } from '../../api/printJobApi';
import { StatusBadge, Skeleton } from '../../components/ui';
import type { PrintJob } from '../../types';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatOrderDetails = (job: PrintJob) => {
  const parts: string[] = [];
  const cfg = job.printConfig;
  const doc = typeof job.documentId === 'object' ? (job.documentId as { pageCount?: number }) : null;
  const pages = cfg?.totalPages || doc?.pageCount;
  if (pages) parts.push(`${pages} ${pages === 1 ? 'page' : 'pages'}`);

  parts.push(cfg?.colorMode === 'COLOR' ? 'Color' : 'B&W');
  parts.push(cfg?.sides === 'DOUBLE' ? 'Double-sided' : 'Single-sided');

  const copies = cfg?.copies || 1;
  if (copies > 1) parts.push(`${copies} copies`);

  return parts.join(' • ');
};

const StudentHomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['myJobs'],
    queryFn: () => printJobApi.getMyJobs({ limit: 5 }).then(r => r.data.data),
  });

  const jobs: PrintJob[] = data?.jobs ?? [];
  const firstName = user?.name?.split(' ')[0] ?? 'Student';
  const greeting = `${getGreeting()}, ${firstName}`;

  const totalOrders = data?.total ?? jobs.length;
  const activeOrders = jobs.filter(j => ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY'].includes(j.status)).length;
  const completedOrders = jobs.filter(j => j.status === 'COLLECTED').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in text-left">

      {/* ─── Greeting & Primary Action ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ready to print your college documents without the counter queue.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/print')}
          id="new-print-btn"
          className="w-full sm:w-auto px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
        >
          <Plus size={18} />
          <span>New Print</span>
        </button>
      </div>

      {/* ─── 3 Summary Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Orders
            </span>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center">
              <FileText size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {isLoading ? <Skeleton className="h-7 w-12" /> : totalOrders}
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Orders
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-600">
            {isLoading ? <Skeleton className="h-7 w-12" /> : activeOrders}
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completed
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
            {isLoading ? <Skeleton className="h-7 w-12" /> : completedOrders}
          </div>
        </div>
      </div>

      {/* ─── Recent Orders Section ───────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Recent Orders
          </h2>
          {jobs.length > 0 && (
            <Link
              to="/student/orders"
              className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Printer size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              No print orders yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5">
              Upload a document to get started.
            </p>
            <button
              type="button"
              onClick={() => navigate('/print')}
              id="start-printing-empty"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} />
              <span>Start Printing</span>
            </button>
          </div>
        ) : (
          /* Recent Orders List */
          <div className="space-y-2.5">
            {jobs.map((job) => {
              const doc = typeof job.documentId === 'object' ? (job.documentId as { originalName?: string }) : null;
              const vendor = typeof job.vendorId === 'object' ? (job.vendorId as { shopName?: string }) : null;
              const docName = doc?.originalName || 'Document.pdf';
              const vendorName = vendor?.shopName || 'Campus Stationery';
              const printDetails = formatOrderDetails(job);
              const formattedDate = new Date(job.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              // Format token e.g. CP-1048 or 1048
              const tokenDisplay = job.publicToken?.startsWith('CP-')
                ? job.publicToken
                : `CP-${job.publicToken || '----'}`;

              return (
                <div
                  key={job._id}
                  onClick={() => navigate(`/student/orders/${job._id}`)}
                  role="button"
                  tabIndex={0}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer text-left block"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                    {/* Left Details */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {docName}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {printDetails}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-slate-700">{vendorName}</span>
                          <span className="text-slate-300">•</span>
                          <span>{formattedDate}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right Metadata */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                      <StatusBadge status={job.status} />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          Token: {tokenDisplay}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          ₹{job.pricing?.total ?? 0}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default StudentHomePage;
