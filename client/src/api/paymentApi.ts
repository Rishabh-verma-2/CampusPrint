import apiClient from './apiClient';
import type { Payment, PrintJob } from '../types';

export interface CreateOrderResponse {
  payment: {
    _id: string;
    gatewayOrderId: string;
    amount: number;
    currency: string;
  };
  paymentSessionId: string; // Used by Cashfree JS SDK
}

export interface PaymentStatusResponse {
  payment: {
    _id: string;
    status: string;
    amount: number;
    gatewayOrderId: string;
    paidAt?: string;
  };
  printJob: {
    _id: string;
    publicToken: string;
    status: string;
  } | null;
}

export const paymentApi = {
  /**
   * Create a Cashfree payment order for a PrintJob.
   * Returns payment_session_id (frontend passes this to Cashfree JS SDK).
   * Amount is recalculated on the backend — not trusted from frontend.
   */
  createOrder: (printJobId: string, forceNew = false) =>
    apiClient.post<{ success: boolean; data: CreateOrderResponse }>(
      '/payments/create-order',
      { printJobId, forceNew }
    ),

  simulateSuccess: (printJobId: string) =>
    apiClient.post<{ success: boolean; data: { message: string; jobStatus: string; orderId: string } }>(
      '/payments/simulate-success',
      { printJobId }
    ),

  /**
   * Verify actual payment status from Cashfree API.
   * Called by /payment/return page after Cashfree redirects back.
   * Do NOT trust Cashfree query params — always verify via backend.
   */
  getStatus: (orderId: string) =>
    apiClient.get<{ success: boolean; data: PaymentStatusResponse }>(
      `/payments/status/${orderId}`
    ),

  /**
   * Get payment details by payment ID (internal).
   */
  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: { payment: Payment } }>(`/payments/${id}`),

  /**
   * Get payment for a specific print job.
   */
  getByJob: (jobId: string) =>
    apiClient.get<{ success: boolean; data: { payment: Payment | null } }>(
      `/payments/by-job/${jobId}`
    ),
};
