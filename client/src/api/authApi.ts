import apiClient from './apiClient';
import type { User } from '../types';

export const authApi = {
  register: (data: {
    name: string; email: string; phone: string; password: string;
    role?: string; studentId?: string; department?: string; year?: number;
  }) => apiClient.post<{ data: { user: User } }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ data: { user: User } }>('/auth/login', data),

  logout: () => apiClient.post('/auth/logout'),

  getMe: () => apiClient.get<{ data: { user: User } }>('/auth/me'),

  studentSession: (data: { name?: string; identifier: string }) =>
    apiClient.post<{ data: { user: User; isReturning: boolean } }>('/auth/student-session', data),

  refresh: () => apiClient.post('/auth/refresh'),
};
