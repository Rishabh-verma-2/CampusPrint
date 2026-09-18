"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashfreeService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const https_1 = __importDefault(require("https"));
const env_1 = require("../config/env");
// ─── Cashfree API URLs ────────────────────────────────────────────────────────
function getBaseUrl() {
    // Cashfree uses 'sandbox' or 'production' environments
    const cfEnv = env_1.env.CASHFREE_ENV.toLowerCase();
    if (cfEnv === 'production' || cfEnv === 'prod') {
        return 'https://api.cashfree.com';
    }
    return 'https://sandbox.cashfree.com';
}
// ─── Helper: make HTTPS request to Cashfree ───────────────────────────────────
function cashfreeRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const baseUrl = getBaseUrl();
        const url = new URL(path, baseUrl);
        const headers = {
            'x-client-id': env_1.env.CASHFREE_APP_ID,
            'x-client-secret': env_1.env.CASHFREE_SECRET_KEY,
            'x-api-version': env_1.env.CASHFREE_API_VERSION || '2025-01-01',
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
        const req = https_1.default.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 400) {
                        const errMsg = parsed?.message || parsed?.error_description || `Cashfree API error (${res.statusCode})`;
                        console.error(`[Cashfree] ${method} ${path} → ${res.statusCode}:`, parsed);
                        reject(new Error(errMsg));
                    }
                    else {
                        resolve(parsed);
                    }
                }
                catch {
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
class CashfreeService {
    /**
     * Create a Cashfree order.
     * Returns payment_session_id that the frontend uses to open Cashfree checkout.
     * SECRET KEY is used here — only on the backend, never exposed to the client.
     */
    static async createOrder(params) {
        console.log(`[Cashfree] Creating order: ${params.orderId} | Amount: ₹${params.orderAmount}`);
        const body = {
            order_id: params.orderId,
            order_amount: params.orderAmount,
            order_currency: params.currency,
            customer_details: params.customer,
            order_meta: params.orderMeta,
        };
        if (params.orderNote) {
            body.order_note = params.orderNote;
        }
        const response = await cashfreeRequest('POST', '/pg/orders', body);
        console.log(`[Cashfree] Order created: cf_order_id=${response.cf_order_id}, session=${response.payment_session_id?.slice(0, 20)}...`);
        return response;
    }
    /**
     * Fetch order status and payment details from Cashfree.
     * Used to verify payment after return from checkout.
     */
    static async getOrderPayments(orderId) {
        console.log(`[Cashfree] Fetching payments for order: ${orderId}`);
        const response = await cashfreeRequest('GET', `/pg/orders/${orderId}/payments`);
        return response;
    }
    /**
     * Get a single Cashfree order details.
     */
    static async getOrder(orderId) {
        console.log(`[Cashfree] Fetching order: ${orderId}`);
        return cashfreeRequest('GET', `/pg/orders/${orderId}`);
    }
    /**
     * Verify Cashfree webhook signature.
     *
     * Cashfree webhook signature format (v2025-01-01):
     * The signature is HMAC-SHA256 of (timestamp + rawBody) using the secret key.
     * Header: x-webhook-signature
     * Header: x-webhook-timestamp
     */
    static verifyWebhookSignature(rawBody, timestamp, signature) {
        try {
            if (!timestamp || !signature) {
                console.warn('[Cashfree] Missing webhook timestamp or signature');
                return false;
            }
            // Cashfree webhook signature: HMAC-SHA256 of (timestamp + rawBody)
            const signedPayload = timestamp + rawBody;
            const expectedSignature = crypto_1.default
                .createHmac('sha256', env_1.env.CASHFREE_SECRET_KEY)
                .update(signedPayload)
                .digest('base64');
            // Use timingSafeEqual to prevent timing attacks
            const expectedBuffer = Buffer.from(expectedSignature);
            const receivedBuffer = Buffer.from(signature);
            if (expectedBuffer.length !== receivedBuffer.length) {
                console.warn('[Cashfree] Webhook signature length mismatch');
                return false;
            }
            const isValid = crypto_1.default.timingSafeEqual(expectedBuffer, receivedBuffer);
            if (!isValid) {
                console.warn('[Cashfree] Webhook signature verification FAILED');
            }
            return isValid;
        }
        catch (err) {
            console.error('[Cashfree] Error verifying webhook signature:', err);
            return false;
        }
    }
    /**
     * Map Cashfree payment_status to our internal PaymentStatus.
     */
    static mapPaymentStatus(cashfreeStatus) {
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
exports.CashfreeService = CashfreeService;
//# sourceMappingURL=CashfreeService.js.map