import apiClient from './apiClient';

export const adminApi = {
  // Dashboard
  getDashboard: () => apiClient.get('/admin/dashboard'),

  // Universities & Campuses
  getUniversities: () => apiClient.get('/admin/universities'),
  getUniversityById: (id: string) => apiClient.get(`/admin/universities/${id}`),
  createUniversity: (data: Record<string, unknown>) =>
    apiClient.post('/admin/universities', data),
  getCampuses: (universityId?: string) =>
    apiClient.get('/admin/campuses', { params: { universityId } }),
  createCampus: (data: Record<string, unknown>) =>
    apiClient.post('/admin/campuses', data),

  // Vendors
  getVendors: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/vendors', { params }),
  createVendor: (data: Record<string, unknown>) =>
    apiClient.post('/admin/vendors', data),
  updateVendorStatus: (id: string, status: string) =>
    apiClient.patch(`/admin/vendors/${id}/status`, { status }),
  approveVendor: (id: string) => apiClient.post(`/admin/vendors/${id}/approve`),
  suspendVendor: (id: string, reason?: string) =>
    apiClient.post(`/admin/vendors/${id}/suspend`, { reason }),
  getVendorCredentials: (id: string) =>
    apiClient.get(`/admin/vendors/${id}/credentials`),

  // Students & Users
  getStudents: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/students', { params }),
  getStudentById: (id: string) => apiClient.get(`/admin/students/${id}`),
  getUsers: (params?: { role?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/users', { params }),
  deactivateUser: (id: string) => apiClient.patch(`/admin/users/${id}/deactivate`),

  // Orders
  getOrders: (params?: { status?: string; search?: string; vendorId?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/orders', { params }),
  getOrderById: (id: string) => apiClient.get(`/admin/orders/${id}`),

  // Payments
  getPayments: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/payments', { params }),

  // Complaints
  getComplaints: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/complaints', { params }),
  updateComplaint: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/admin/complaints/${id}`, data),

  // Analytics
  getAnalytics: (period?: string) =>
    apiClient.get('/admin/analytics', { params: { period } }),

  // Audit Logs
  getAuditLogs: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/audit-logs', { params }),

  // Settings
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (data: Record<string, unknown>) =>
    apiClient.patch('/admin/settings', data),
};
