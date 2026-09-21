import apiClient from './apiClient';
import type { PrintJob, PrintConfig } from '../types';

export const printJobApi = {
  create: (data: { documentId?: string; documentIds?: string[]; vendorId: string; printConfig: PrintConfig }) =>
    apiClient.post<{ data: { printJob: PrintJob } }>('/print-jobs', data),

  getMyJobs: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: { jobs: PrintJob[]; total: number } }>('/print-jobs', { params }),

  getById: (id: string) =>
    apiClient.get<{ data: { job: PrintJob; documentUrl?: string } }>(`/print-jobs/${id}`),

  cancel: (id: string, reason?: string) =>
    apiClient.post(`/print-jobs/${id}/cancel`, { reason }),

  // Queue position — used by students to track their place in the vendor's active queue
  getQueuePosition: (id: string) =>
    apiClient.get<{
      data: {
        status: string;
        position: number | null;
        jobsAhead: number;
        estimatedMinutes: number;
        message: string;
      };
    }>(`/print-jobs/${id}/queue-position`),

  // Vendor actions
  accept: (id: string) => apiClient.post(`/print-jobs/${id}/accept`),
  start: (id: string) =>
    apiClient.post<{ data: { job: PrintJob; documentUrl?: string } }>(`/print-jobs/${id}/start`),
  markReady: (id: string) => apiClient.post(`/print-jobs/${id}/ready`),
  collect: (id: string, token?: string) =>
    apiClient.post(`/print-jobs/${id}/collect`, { token }),
  reportProblem: (id: string, note: string) =>
    apiClient.post(`/print-jobs/${id}/report-problem`, { note }),
  verifyToken: (token: string) =>
    apiClient.post('/print-jobs/verify-token', { token }),
};
