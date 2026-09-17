import apiClient from './apiClient';
import type { DocumentFile } from '../types';

export const documentApi = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{ data: { document: DocumentFile } }>('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
  },

  getById: (id: string) =>
    apiClient.get<{ data: { document: DocumentFile } }>(`/documents/${id}`),

  delete: (id: string) => apiClient.delete(`/documents/${id}`),
};
