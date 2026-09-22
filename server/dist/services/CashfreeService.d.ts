export interface CashfreeCustomerDetails {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
}
export interface CashfreeOrderMeta {
    return_url: string;
    notify_url: string;
    payment_methods?: string;
}
export interface CreateCashfreeOrderParams {
    orderId: string;
    orderAmount: number;
    currency: string;
    customer: CashfreeCustomerDetails;
    orderMeta: CashfreeOrderMeta;
    orderNote?: string;
}
export interface CashfreeOrderResponse {
    cf_order_id: string;
    order_id: string;
    entity: string;
    order_currency: string;
    order_amount: number;
    order_status: string;
    payment_session_id: string;
    order_expiry_time?: string;
    customer_details?: CashfreeCustomerDetails;
}
export interface CashfreePaymentDetail {
    cf_payment_id: string;
    order_id: string;
    payment_status: string;
    payment_method?: {
        upi?: {
            upi_id?: string;
        };
    };
    payment_amount: number;
    payment_currency: string;
    payment_time?: string;
    error_details?: {
        error_code?: string;
        error_description?: string;
    };
}
export declare class CashfreeService {
    /**
     * Create a Cashfree order.
     * Returns payment_session_id that the frontend uses to open Cashfree checkout.
     * SECRET KEY is used here — only on the backend, never exposed to the client.
     */
    static createOrder(params: CreateCashfreeOrderParams): Promise<CashfreeOrderResponse>;
    /**
     * Fetch order status and payment details from Cashfree.
     * Used to verify payment after return from checkout.
     */
    static getOrderPayments(orderId: string): Promise<CashfreePaymentDetail[]>;
    /**
     * Get a single Cashfree order details.
     */
    static getOrder(orderId: string): Promise<CashfreeOrderResponse>;
    /**
     * Verify Cashfree webhook signature.
     *
     * Cashfree webhook signature format (v2025-01-01):
     * The signature is HMAC-SHA256 of (timestamp + rawBody) using the secret key.
     * Header: x-webhook-signature
     * Header: x-webhook-timestamp
     */
    static verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean;
    /**
     * Map Cashfree payment_status to our internal PaymentStatus.
     */
    static mapPaymentStatus(cashfreeStatus: string): 'SUCCESS' | 'FAILED' | 'USER_DROPPED' | 'PENDING' | 'CANCELLED';
}
//# sourceMappingURL=CashfreeService.d.ts.map