import apiClient from './apiClient';

export const paymentApi = {
  createOrder: (printJobId: string) =>
    apiClient.post<{
      data: {
        payment: { _id: string; gatewayOrderId: string; amount: number };
        paymentSessionId: string;
      };
    }>('/payments/create-order', { printJobId }),

  // Mock: simulate successful payment webhook
  simulateWebhook: (data: { gatewayOrderId: string; gatewayPaymentId: string; status: string }) =>
    apiClient.post('/payments/webhook', data),

  getById: (id: string) => apiClient.get(`/payments/${id}`),
  getByJob: (jobId: string) => apiClient.get(`/payments/by-job/${jobId}`),
};
