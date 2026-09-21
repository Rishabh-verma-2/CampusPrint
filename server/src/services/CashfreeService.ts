import crypto from 'crypto';
import https from 'https';
import { env } from '../config/env';

// ─── Cashfree API URLs ────────────────────────────────────────────────────────

function getBaseUrl(): string {
  // Cashfree uses 'sandbox' or 'production' environments
  const cfEnv = env.CASHFREE_ENV.toLowerCase();
  if (cfEnv === 'production' || cfEnv === 'prod') {
    return 'https://api.cashfree.com';
  }
  return 'https://sandbox.cashfree.com';
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  orderId: string;         // Our unique order ID: CP_xxx_xxx
  orderAmount: number;     // Amount in INR
  currency: string;        // 'INR'
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
  payment_status: string; // 'SUCCESS' | 'FAILED' | 'USER_DROPPED' | 'PENDING' | 'CANCELLED'
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

// ─── Helper: make HTTPS request to Cashfree ───────────────────────────────────

function cashfreeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl();
    const url = new URL(path, baseUrl);

    const headers: Record<string, string> = {
      'x-client-id': env.CASHFREE_APP_ID,
      'x-client-secret': env.CASHFREE_SECRET_KEY,
      'x-api-version': env.CASHFREE_API_VERSION || '2025-01-01',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const requestBody = body ? JSON.stringify(body) : undefined;
    if (requestBody) {
      headers['Content-Length'] = Buffer.byteLength(requestBody).toString();
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            const errMsg = parsed?.message || parsed?.error_description || `Cashfree API error (${res.statusCode})`;
            console.error(`[Cashfree] ${method} ${path} → ${res.statusCode}:`, parsed);
            reject(new Error(errMsg));
          } else {
            resolve(parsed as T);
          }
        } catch {
          reject(new Error('Failed to parse Cashfree response'));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Cashfree] Network error:', err.message);
      reject(err);
    });

    if (requestBody) {
      req.write(requestBody);
    }
    req.end();
  });
}

// ─── CashfreeService ──────────────────────────────────────────────────────────

export class CashfreeService {
  /**
   * Create a Cashfree order.
   * Returns payment_session_id that the frontend uses to open Cashfree checkout.
   * SECRET KEY is used here — only on the backend, never exposed to the client.
   */
  static async createOrder(params: CreateCashfreeOrderParams): Promise<CashfreeOrderResponse> {
    console.log(`[Cashfree] Creating order: ${params.orderId} | Amount: ₹${params.orderAmount}`);

    const orderMeta: Record<string, unknown> = {
      return_url: params.orderMeta.return_url,
      notify_url: params.orderMeta.notify_url,
    };
    if (params.orderMeta.payment_methods) {
      orderMeta.payment_methods = params.orderMeta.payment_methods;
    }

    const body: Record<string, unknown> = {
      order_id: params.orderId,
      order_amount: params.orderAmount,
      order_currency: params.currency,
      customer_details: params.customer,
      order_meta: orderMeta,
    };

    if (params.orderNote) {
      body.order_note = params.orderNote;
    }

    const response = await cashfreeRequest<CashfreeOrderResponse>(
      'POST',
      '/pg/orders',
      body
    );

    console.log(`[Cashfree] Order created: cf_order_id=${response.cf_order_id}, session=${response.payment_session_id?.slice(0, 20)}...`);
    return response;
  }

  /**
   * Fetch order status and payment details from Cashfree.
   * Used to verify payment after return from checkout.
   */
  static async getOrderPayments(orderId: string): Promise<CashfreePaymentDetail[]> {
    console.log(`[Cashfree] Fetching payments for order: ${orderId}`);
    const response = await cashfreeRequest<CashfreePaymentDetail[]>(
      'GET',
      `/pg/orders/${orderId}/payments`
    );
    return response;
  }

  /**
   * Get a single Cashfree order details.
   */
  static async getOrder(orderId: string): Promise<CashfreeOrderResponse> {
    console.log(`[Cashfree] Fetching order: ${orderId}`);
    return cashfreeRequest<CashfreeOrderResponse>('GET', `/pg/orders/${orderId}`);
  }

  /**
   * Verify Cashfree webhook signature.
   * 
   * Cashfree webhook signature format (v2025-01-01):
   * The signature is HMAC-SHA256 of (timestamp + rawBody) using the secret key.
   * Header: x-webhook-signature
   * Header: x-webhook-timestamp
   */
  static verifyWebhookSignature(
    rawBody: string,
    timestamp: string,
    signature: string
  ): boolean {
    try {
      if (!timestamp || !signature) {
        console.warn('[Cashfree] Missing webhook timestamp or signature');
        return false;
      }

      // Cashfree webhook signature: HMAC-SHA256 of (timestamp + rawBody)
      const signedPayload = timestamp + rawBody;
      const expectedSignature = crypto
        .createHmac('sha256', env.CASHFREE_SECRET_KEY)
        .update(signedPayload)
        .digest('base64');

      // Use timingSafeEqual to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature);
      const receivedBuffer = Buffer.from(signature);

      if (expectedBuffer.length !== receivedBuffer.length) {
        console.warn('[Cashfree] Webhook signature length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
      if (!isValid) {
        console.warn('[Cashfree] Webhook signature verification FAILED');
      }
      return isValid;
    } catch (err) {
      console.error('[Cashfree] Error verifying webhook signature:', err);
      return false;
    }
  }

  /**
   * Map Cashfree payment_status to our internal PaymentStatus.
   */
  static mapPaymentStatus(cashfreeStatus: string): 'SUCCESS' | 'FAILED' | 'USER_DROPPED' | 'PENDING' | 'CANCELLED' {
    switch (cashfreeStatus?.toUpperCase()) {
      case 'SUCCESS':
        return 'SUCCESS';
      case 'FAILED':
        return 'FAILED';
      case 'USER_DROPPED':
        return 'USER_DROPPED';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'PENDING':
      default:
        return 'PENDING';
    }
  }
}
