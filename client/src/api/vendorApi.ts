import apiClient from './apiClient';
import type { Vendor } from '../types';

export const vendorApi = {
  getVendors: (params?: { campusId?: string; universityId?: string }) =>
    apiClient.get<{ data: { vendors: Vendor[] } }>('/vendors', { params }),

  getById: (id: string) =>
    apiClient.get<{ data: { vendor: Vendor } }>(`/vendors/${id}`),

  getPricing: (id: string) =>
    apiClient.get<{ data: { pricing: Vendor['pricing'] } }>(`/vendors/${id}/pricing`),

  // Vendor dashboard
  getDashboard: () => apiClient.get('/vendors/me/dashboard'),
  getQueue: (params?: { status?: string; page?: number; limit?: number; sort?: string }) =>
    apiClient.get('/vendors/me/queue', { params }),
  getAnalytics: (period?: string) =>
    apiClient.get('/vendors/me/analytics', { params: { period } }),
  updatePricing: (data: { bwPerPage?: number; colorPerPage?: number; duplexDiscount?: number }) =>
    apiClient.patch('/vendors/me/pricing', data),
  updateAvailability: (availability: string) =>
    apiClient.patch('/vendors/me/availability', { availability }),
  updateProfile: (data: Record<string, unknown>) =>
    apiClient.patch('/vendors/me/profile', data),
};
