import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  Store,
  FileText,
  MapPin,
  CheckCircle2,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Spinner, Skeleton } from '../../components/ui';

const UniversitiesPage: React.FC = () => {
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['adminUniversities'],
    queryFn: () => adminApi.getUniversities().then((r) => r.data.data.universities),
  });

  const universities = data || [];

  if (isLoading) {
    return (
      <div className="space-y-6 text-left animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <Building2 size={12} />
              <span>CampusPrint Institution</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
            Universities Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configured university deployments and campus coverage
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="self-start sm:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Universities Cards */}
      <div className="grid grid-cols-1 gap-6">
        {universities.map((uni: any) => (
          <div
            key={uni._id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs flex-shrink-0">
                  {uni.code || 'PU'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{uni.name}</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={12} />
                      <span>Active</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin size={13} className="text-slate-400" />
                    <span>{uni.location || 'Vadodara, Gujarat, India'}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Calendar size={13} />
                <span>Added on {new Date(uni.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            {/* University Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Registered Students</div>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                    {uni.studentCount ?? 0}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Store size={18} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Active Print Stores</div>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                    {uni.vendorCount ?? 0}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Total Print Jobs</div>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                    {uni.orderCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Campus Coverage */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Configured Campus Coverage
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="font-bold text-slate-800">Main Campus, Vadodara</span>
                  <span className="text-slate-400">• P.O. Limda, Ta. Waghodia, Dist. Vadodara</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Operational
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UniversitiesPage;
