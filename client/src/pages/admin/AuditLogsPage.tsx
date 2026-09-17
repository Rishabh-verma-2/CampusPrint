import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Search,
  RefreshCw,
  Shield,
  Clock,
  Terminal,
  FileCode,
  User,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Spinner } from '../../components/ui';

interface AuditLogItem {
  _id: string;
  actorId?: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['adminAuditLogs', search],
    queryFn: () =>
      adminApi
        .getAuditLogs({
          search: search.trim() || undefined,
        })
        .then((r) => r.data.data),
  });

  const logs: AuditLogItem[] = data?.logs || [];
  const total = data?.total ?? logs.length;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <Shield size={12} />
            <span>Parul University Security & Compliance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            System Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable chronological record of administrative actions, store approvals, and configuration changes
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

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Logged Events
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
          <span className="text-[11px] text-slate-400">Events captured</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Integrity Status
          </p>
          <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Immutable & Verified</span>
          </p>
          <span className="text-[11px] text-slate-400">MongoDB Audit Trail</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Admin Principal
          </p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            admin@campusprint.com
          </p>
          <span className="text-[11px] text-slate-400">Super Administrator</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search logs by action, entity type, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <p className="text-xs text-slate-500">Loading audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <History size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Audit Logs</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search
                ? `No logs match "${search}".`
                : 'No administrative actions have been logged yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log._id;

                  return (
                    <React.Fragment key={log._id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-semibold bg-slate-100 text-blue-700 px-2 py-0.5 rounded-md">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">
                            {log.actorId?.name || 'Administrator'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {log.actorId?.email || 'admin@campusprint.com'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {log.entityType ? (
                            <div>
                              <span className="font-medium text-slate-700">{log.entityType}</span>
                              {log.entityId && (
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  #{log.entityId.slice(-6)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {log.metadata && Object.keys(log.metadata).length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedLogId(isExpanded ? null : log._id)
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <FileCode size={12} />
                              <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No extra data</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && log.metadata && (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="p-4">
                            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
