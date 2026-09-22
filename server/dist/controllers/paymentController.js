"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulatePaymentSuccess = exports.getPaymentByJob = exports.getPayment = exports.handlePaymentWebhook = exports.getPaymentStatus = exports.createPaymentOrder = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const PrintJob_1 = require("../models/PrintJob");
const Payment_1 = require("../models/Payment");
const User_1 = require("../models/User");
const StudentProfile_1 = require("../models/StudentProfile");
const socketManager_1 = require("../sockets/socketManager");
const NotificationService_1 = require("../services/NotificationService");
const CashfreeService_1 = require("../services/CashfreeService");
const env_1 = require("../config/env");
const uuid_1 = require("uuid");
// ─── Create Payment Order ──────────────────────────────────────────────────────
// POST /api/payments/create-order
// Frontend sends: { printJobId }
// Backend recalculates amount from PrintJob — frontend amount is NEVER trusted.
exports.createPaymentOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { printJobId, forceNew } = req.body;
    if (!printJobId)
        throw (0, errorHandler_1.createError)('printJobId is required', 400, 'MISSING_JOB_ID');
    // 1. Find and validate the PrintJob
    const job = await PrintJob_1.PrintJob.findById(printJobId);
    if (!job)
        throw (0, errorHandler_1.createError)('Print job not found', 404, 'JOB_NOT_FOUND');
    // 2. Verify the requesting student owns this job
    if (job.studentId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    }
    // 3. Verify job is in PAYMENT_PENDING state
    if (job.status !== 'PAYMENT_PENDING') {
        throw (0, errorHandler_1.createError)(`Job cannot be paid in its current state: ${job.status}`, 400, 'INVALID_STATE');
    }
    // 4. Verify amount is valid (server-side only — from the saved pricing)
    const amount = job.pricing.total;
    if (!amount || amount <= 0) {
        throw (0, errorHandler_1.createError)('Invalid payment amount', 400, 'INVALID_AMOUNT');
    }
    // 5. Duplicate payment protection: check for existing payment
    const existingPayment = await Payment_1.Payment.findOne({ printJobId: job._id });
    if (existingPayment) {
        if (existingPayment.status === 'SUCCESS') {
            throw (0, errorHandler_1.createError)('Payment already completed for this job', 400, 'ALREADY_PAID');
        }
        // If not forcing fresh order, try reusing existing session
        if (!forceNew && (existingPayment.status === 'PENDING' || existingPayment.status === 'CREATED')) {
            const ageMs = Date.now() - existingPayment.createdAt.getTime();
            if (ageMs < 15 * 60 * 1000) {
                console.log(`[Payment] Attempting reuse of session for job ${printJobId}`);
                try {
                    const cfOrder = await CashfreeService_1.CashfreeService.getOrder(existingPayment.gatewayOrderId);
                    if (cfOrder.payment_session_id && cfOrder.order_status === 'ACTIVE') {
                        res.status(200).json({
                            success: true,
                            data: {
                                payment: {
                                    _id: existingPayment._id,
                                    gatewayOrderId: existingPayment.gatewayOrderId,
                                    amount: existingPayment.amount,
                                    currency: existingPayment.currency,
                                },
                                paymentSessionId: cfOrder.payment_session_id,
                            },
                        });
                        return;
                    }
                }
                catch {
                    // If we can't refresh, fall through to create a new order
                }
            }
        }
        // Expired, failed, or force-refreshed payment — cancel it and create fresh
        existingPayment.status = 'CANCELLED';
        await existingPayment.save();
    }
    // 6. Get student details for Cashfree customer object
    const student = await User_1.User.findById(req.user._id);
    await StudentProfile_1.StudentProfile.findOne({ userId: req.user._id });
    const rawPhone = student?.phone ? student.phone.replace(/\D/g, '').slice(-10) : '';
    const customerPhone = rawPhone.length === 10 && /^[6-9]/.test(rawPhone) ? rawPhone : '9876543210';
    const customerEmail = student?.email || `student_${req.user._id.slice(-6)}@campusprint.app`;
    const customerName = student?.name || 'Student';
    const customerId = `CP_STU_${req.user._id.slice(-8)}`;
    // 7. Generate a unique Cashfree order ID
    // Format: CP_<jobToken>_<8charUUID> (safe for Cashfree: alphanumeric + underscore)
    const shortToken = job.publicToken.replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const uniqueSuffix = (0, uuid_1.v4)().replace(/-/g, '').slice(0, 8).toUpperCase();
    const cfOrderId = `CP_${shortToken}_${uniqueSuffix}`;
    // 8. Build Cashfree order URLs
    // NOTE: Cashfree strictly requires {order_id} placeholder in return_url!
    const returnUrl = `${env_1.env.FRONTEND_URL}/payment/return?order_id={order_id}`;
    const notifyUrl = `${env_1.env.BACKEND_URL}/api/payments/webhook`;
    console.log(`[Payment] Initiating payment for job ${printJobId} | Amount: ₹${amount} | CashfreeOrderId: ${cfOrderId}`);
    // 9. Create order in Cashfree
    // NOTE: Do not restrict payment_methods to 'upi' only — in sandbox accounts, strict
    // filtering crashes Cashfree checkout if direct-UPI isn't provisioned.
    // Omitting payment_methods allows all sandbox payment modes (UPI, Cards, Netbanking).
    let cfOrder;
    try {
        cfOrder = await CashfreeService_1.CashfreeService.createOrder({
            orderId: cfOrderId,
            orderAmount: Math.round(amount * 100) / 100, // ensure 2 decimal places
            currency: 'INR',
            customer: {
                customer_id: customerId,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
            },
            orderMeta: {
                return_url: returnUrl,
                notify_url: notifyUrl,
            },
            orderNote: `CampusPrint - ${job.publicToken}`,
        });
        console.log(`[Payment] Cashfree order created: ${cfOrderId}`);
    }
    catch (err) {
        console.error('[Payment] Cashfree createOrder failed:', err.message);
        throw (0, errorHandler_1.createError)('Payment gateway error. Please try again.', 502, 'GATEWAY_ERROR');
    }
    // 10. Create local Payment record
    const payment = await Payment_1.Payment.create({
        printJobId: job._id,
        studentId: req.user._id,
        vendorId: job.vendorId,
        gateway: 'CASHFREE',
        gatewayOrderId: cfOrderId,
        amount,
        currency: 'INR',
        status: 'CREATED',
    });
    // 11. Link payment to job
    job.paymentId = payment._id;
    await job.save();
    console.log(`[Payment] Payment record created: ${payment._id} | Session ready for job ${job.publicToken}`);
    // 12. Return payment_session_id to frontend (NOT the secret key, ever)
    res.status(201).json({
        success: true,
        data: {
            payment: {
                _id: payment._id,
                gatewayOrderId: cfOrderId,
                amount: payment.amount,
                currency: payment.currency,
            },
            paymentSessionId: cfOrder.payment_session_id,
        },
    });
});
// ─── Get Payment Status (by our internal Cashfree orderId) ──────────────────
// GET /api/payments/status/:orderId
// Called by the return page to verify actual payment status from Cashfree.
// NEVER trusts frontend-provided payment success claims.
exports.getPaymentStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const orderId = req.params.orderId;
    // Find our local payment record
    const payment = await Payment_1.Payment.findOne({ gatewayOrderId: orderId });
    if (!payment) {
        throw (0, errorHandler_1.createError)('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }
    // Authorization: student can only check their own payments
    if (req.user.role === 'STUDENT' && payment.studentId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    }
    // If already confirmed as SUCCESS by webhook or previous check, return immediately
    if (payment.status === 'SUCCESS') {
        const job = await PrintJob_1.PrintJob.findById(payment.printJobId)
            .populate('vendorId', 'shopName address')
            .select('publicToken status _id vendorId');
        return res.json({
            success: true,
            data: {
                payment: {
                    _id: payment._id,
                    status: payment.status,
                    amount: payment.amount,
                    gatewayOrderId: payment.gatewayOrderId,
                    paidAt: payment.paidAt,
                },
                printJob: job
                    ? {
                        _id: job._id,
                        publicToken: job.publicToken,
                        status: job.status,
                        vendor: job.vendorId?.shopName
                            ? { shopName: job.vendorId.shopName, address: job.vendorId.address }
                            : null,
                    }
                    : null,
            },
        });
    }
    // Fetch actual status from Cashfree API (do not trust cached status for non-SUCCESS)
    console.log(`[Payment] Verifying status with Cashfree for order: ${orderId}`);
    try {
        const payments = await CashfreeService_1.CashfreeService.getOrderPayments(orderId);
        if (payments && payments.length > 0) {
            // Get the most recent payment attempt
            const latestPayment = payments[payments.length - 1];
            const mappedStatus = CashfreeService_1.CashfreeService.mapPaymentStatus(latestPayment.payment_status);
            console.log(`[Payment] Status check: order=${orderId} cashfree=${latestPayment.payment_status} mapped=${mappedStatus}`);
            // Update our record if status has changed
            if (mappedStatus !== payment.status) {
                payment.cashfreeStatus = latestPayment.payment_status;
                if (latestPayment.cf_payment_id) {
                    payment.gatewayPaymentId = latestPayment.cf_payment_id;
                }
                if (mappedStatus === 'SUCCESS') {
                    payment.status = 'SUCCESS';
                    payment.paidAt = new Date();
                    payment.paymentMethod = latestPayment.payment_method ? 'upi' : 'upi';
                    await payment.save();
                    // Atomically transition PrintJob to QUEUED — race-condition safe
                    await transitionJobToPaid(payment.printJobId.toString(), payment.studentId.toString(), payment.vendorId?.toString());
                }
                else if (mappedStatus === 'FAILED') {
                    payment.status = 'FAILED';
                    payment.failedAt = new Date();
                    await payment.save();
                    console.log(`[Payment] Payment FAILED for order ${orderId}`);
                }
                else if (mappedStatus === 'USER_DROPPED') {
                    payment.status = 'USER_DROPPED';
                    payment.userDroppedAt = new Date();
                    await payment.save();
                    console.log(`[Payment] Payment USER_DROPPED for order ${orderId}`);
                }
                else if (mappedStatus === 'CANCELLED') {
                    payment.status = 'CANCELLED';
                    await payment.save();
                    console.log(`[Payment] Payment CANCELLED for order ${orderId}`);
                }
                else {
                    payment.status = 'PENDING';
                    await payment.save();
                }
            }
        }
    }
    catch (err) {
        // Don't fail the request if Cashfree check fails — return cached status
        console.error('[Payment] Error fetching Cashfree status (returning cached):', err.message);
    }
    const job = await PrintJob_1.PrintJob.findById(payment.printJobId)
        .populate('vendorId', 'shopName address')
        .select('publicToken status _id vendorId');
    res.json({
        success: true,
        data: {
            payment: {
                _id: payment._id,
                status: payment.status,
                amount: payment.amount,
                gatewayOrderId: payment.gatewayOrderId,
                paidAt: payment.paidAt,
            },
            printJob: job
                ? {
                    _id: job._id,
                    publicToken: job.publicToken,
                    status: job.status,
                    vendor: job.vendorId?.shopName
                        ? { shopName: job.vendorId.shopName, address: job.vendorId.address }
                        : null,
                }
                : null,
        },
    });
});
// ─── Cashfree Webhook ─────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Cashfree sends this asynchronously after payment events.
// Body must be parsed as raw Buffer for signature verification.
// ALWAYS responds 200 to prevent Cashfree retries.
const handlePaymentWebhook = async (req, res) => {
    const timestamp = req.headers['x-webhook-timestamp'];
    const signature = req.headers['x-webhook-signature'];
    // rawBody is set by express.raw() middleware registered for this route
    const rawBody = req.rawBody;
    console.log(`[Webhook] Received Cashfree webhook | timestamp=${timestamp}`);
    // 1. Verify webhook signature (CRITICAL — reject tampered webhooks)
    if (rawBody && timestamp && signature) {
        const isValid = CashfreeService_1.CashfreeService.verifyWebhookSignature(rawBody, timestamp, signature);
        if (!isValid) {
            console.error('[Webhook] SIGNATURE VERIFICATION FAILED — rejecting webhook');
            // Still respond 200 so Cashfree doesn't retry endlessly on bad webhooks
            res.status(200).json({ success: false, message: 'Invalid signature' });
            return;
        }
        console.log('[Webhook] Signature verified OK');
    }
    else {
        // In sandbox/development, Cashfree may not always send signatures
        console.warn('[Webhook] Missing signature headers');
        if (env_1.env.isProd()) {
            console.error('[Webhook] Rejecting unsigned webhook in production');
            res.status(200).json({ success: false, message: 'Missing signature' });
            return;
        }
        console.warn('[Webhook] Processing unsigned webhook (sandbox/dev mode only)');
    }
    // 2. Parse webhook payload
    let payload;
    try {
        payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
    catch {
        console.error('[Webhook] Failed to parse payload');
        res.status(200).json({ success: true }); // 200 to prevent retries
        return;
    }
    // 3. Extract event data
    // Cashfree webhook structure: { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: {...}, payment: {...} } }
    const eventType = payload?.type;
    const orderData = payload?.data?.order;
    const paymentData = payload?.data?.payment;
    console.log(`[Webhook] Event: ${eventType} | OrderId: ${orderData?.order_id}`);
    if (!orderData?.order_id) {
        console.warn('[Webhook] No order_id in payload — ignoring');
        res.status(200).json({ success: true });
        return;
    }
    const cfOrderId = orderData.order_id;
    // 4. Find our local payment record
    const payment = await Payment_1.Payment.findOne({ gatewayOrderId: cfOrderId });
    if (!payment) {
        console.warn(`[Webhook] Unknown order: ${cfOrderId} — ignoring`);
        res.status(200).json({ success: true, message: 'Unknown order' });
        return;
    }
    // 5. Idempotency: already processed successfully — skip to prevent duplicate vendor notifications
    if (payment.status === 'SUCCESS') {
        console.log(`[Webhook] Already processed (SUCCESS) for order ${cfOrderId} — idempotency skip`);
        res.status(200).json({ success: true, message: 'Already processed' });
        return;
    }
    // 6. Record webhook receipt time
    payment.webhookReceivedAt = new Date();
    // 7. Map Cashfree event type to our status
    const cfPaymentStatus = paymentData?.payment_status;
    const mappedStatus = CashfreeService_1.CashfreeService.mapPaymentStatus(cfPaymentStatus || eventType?.replace('_WEBHOOK', '') || '');
    console.log(`[Webhook] Payment status: cashfree=${cfPaymentStatus} mapped=${mappedStatus} | order=${cfOrderId}`);
    payment.cashfreeStatus = cfPaymentStatus;
    if (paymentData?.cf_payment_id) {
        payment.gatewayPaymentId = paymentData.cf_payment_id;
    }
    // 8. Process by status
    if (mappedStatus === 'SUCCESS') {
        payment.status = 'SUCCESS';
        payment.paidAt = new Date();
        payment.paymentMethod = paymentData?.payment_group || 'upi';
        await payment.save();
        console.log(`[Webhook] Payment SUCCESS saved for order ${cfOrderId}`);
        // Atomically transition PrintJob to QUEUED and notify vendor
        // This is idempotent — if already QUEUED (from redirect path), the atomic update returns null and skips
        await transitionJobToPaid(payment.printJobId.toString(), payment.studentId.toString(), payment.vendorId?.toString());
    }
    else if (mappedStatus === 'FAILED') {
        payment.status = 'FAILED';
        payment.failedAt = new Date();
        await payment.save();
        console.log(`[Webhook] Payment FAILED for order ${cfOrderId} — order NOT sent to vendor`);
    }
    else if (mappedStatus === 'USER_DROPPED') {
        payment.status = 'USER_DROPPED';
        payment.userDroppedAt = new Date();
        await payment.save();
        console.log(`[Webhook] Payment USER_DROPPED for order ${cfOrderId}`);
    }
    else if (mappedStatus === 'CANCELLED') {
        payment.status = 'CANCELLED';
        await payment.save();
        console.log(`[Webhook] Payment CANCELLED for order ${cfOrderId}`);
    }
    else {
        payment.status = 'PENDING';
        await payment.save();
        console.log(`[Webhook] Payment PENDING for order ${cfOrderId}`);
    }
    // Always respond 200 immediately to acknowledge receipt
    res.status(200).json({ success: true });
};
exports.handlePaymentWebhook = handlePaymentWebhook;
// ─── Get Payment ───────────────────────────────────────────────────────────────
// GET /api/payments/:id
exports.getPayment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const payment = await Payment_1.Payment.findById(req.params.id);
    if (!payment)
        throw (0, errorHandler_1.createError)('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    if (req.user.role === 'STUDENT' && payment.studentId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    }
    res.json({ success: true, data: { payment } });
});
// ─── Get Payment by Job ────────────────────────────────────────────────────────
// GET /api/payments/by-job/:jobId
exports.getPaymentByJob = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const job = await PrintJob_1.PrintJob.findById(req.params.jobId);
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    if (job.studentId.toString() !== req.user._id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    }
    const payment = await Payment_1.Payment.findOne({ printJobId: job._id });
    res.json({ success: true, data: { payment } });
});
// ─── Internal: Atomically transition PrintJob to QUEUED after payment ─────────
//
// RACE CONDITION SAFE: Uses findOneAndUpdate with { status: 'PAYMENT_PENDING' } filter.
// If the job was already transitioned by another path (webhook or redirect arriving
// simultaneously), findOneAndUpdate returns null and we skip the emit.
// This guarantees the vendor receives exactly ONE notification per confirmed payment.
async function transitionJobToPaid(printJobId, studentId, vendorId) {
    try {
        console.log(`[Payment] Attempting atomic transition to QUEUED for job ${printJobId}`);
        // ATOMIC: Only succeeds if job is currently in PAYMENT_PENDING state.
        // Returns null if already transitioned (idempotent).
        const updatedJob = await PrintJob_1.PrintJob.findOneAndUpdate({ _id: printJobId, status: 'PAYMENT_PENDING' }, { $set: { status: 'QUEUED' } }, { new: true });
        if (!updatedJob) {
            // Job was already transitioned — this is expected in race condition cases
            console.log(`[Payment] Job ${printJobId} already transitioned (race condition handled) — skipping vendor notification`);
            return;
        }
        console.log(`[Payment] Job ${updatedJob.publicToken} transitioned PAYMENT_PENDING → QUEUED`);
        // Emit to vendor room ONLY after the atomic DB update succeeded.
        // vendor:<vendorId> where vendorId = Vendor document _id (matches socketManager room assignment)
        try {
            const io = (0, socketManager_1.getIO)();
            // Populate the job for a richer socket payload
            const populatedJob = await PrintJob_1.PrintJob.findById(updatedJob._id)
                .populate('studentId', 'name phone')
                .populate('documentId', 'originalName pageCount')
                .populate('documentIds', 'originalName pageCount')
                .lean();
            const jobPayload = populatedJob ?? updatedJob;
            // Emit new order event to the vendor's private room
            if (updatedJob.vendorId) {
                const vendorRoom = `vendor:${updatedJob.vendorId.toString()}`;
                io.to(vendorRoom).emit('printJob:new', { job: jobPayload });
                console.log(`[Payment] Emitted printJob:new to room ${vendorRoom} for job ${updatedJob.publicToken}`);
            }
            // Notify the student that their order is confirmed
            io.to(`student:${studentId}`).emit('printJob:updated', { job: jobPayload });
            // Notify the vendor room that queue positions shifted
            if (updatedJob.vendorId) {
                io.to(`vendor:${updatedJob.vendorId.toString()}`).emit('queue:updated', {
                    vendorId: updatedJob.vendorId.toString(),
                });
            }
        }
        catch (socketErr) {
            // Socket failure must NOT prevent the order from being placed
            // The order is already QUEUED in the DB — vendor will see it on next poll/refresh
            console.warn('[Payment] Socket emit failed (non-fatal):', socketErr);
        }
        // ─── Persist notifications ────────────────────────────────────────────────
        // Notify student
        await NotificationService_1.NotificationService.create(studentId, 'PAYMENT_SUCCESS', 'Payment Successful', `Payment confirmed for ${updatedJob.publicToken}. Your order is in the vendor's queue.`, { jobId: updatedJob._id, token: updatedJob.publicToken });
        // Notify vendor
        if (vendorId) {
            try {
                const { Vendor } = await Promise.resolve().then(() => __importStar(require('../models/Vendor')));
                const vendor = await Vendor.findById(vendorId);
                if (vendor) {
                    await NotificationService_1.NotificationService.create(vendor.userId.toString(), 'JOB_QUEUED', 'New Print Job', `New paid print job ${updatedJob.publicToken} is waiting in your queue.`, { jobId: updatedJob._id, token: updatedJob.publicToken });
                }
            }
            catch (notifErr) {
                // Non-fatal — notification failure should not affect order placement
                console.warn('[Payment] Vendor notification creation failed (non-fatal):', notifErr);
            }
        }
        console.log(`[Payment] Order confirmation complete for job ${updatedJob.publicToken}`);
    }
    catch (err) {
        console.error('[Payment] Error in transitionJobToPaid:', err);
        // Do NOT re-throw — a notification failure must not fail the HTTP response
    }
}
// ─── Dev/Sandbox Simulation Endpoint ──────────────────────────────────────────
// POST /api/payments/simulate-success
// For testing only: transitions a PAYMENT_PENDING job to QUEUED as if payment completed.
exports.simulatePaymentSuccess = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { printJobId } = req.body;
    if (!printJobId)
        throw (0, errorHandler_1.createError)('printJobId is required', 400, 'MISSING_JOB_ID');
    const job = await PrintJob_1.PrintJob.findById(printJobId);
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    // Authorize student
    if (req.user.role === 'STUDENT' && job.studentId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    }
    if (job.status !== 'PAYMENT_PENDING') {
        return res.json({
            success: true,
            data: { message: `Job is already in ${job.status} status`, jobStatus: job.status },
        });
    }
    // Find or create payment record
    let payment = await Payment_1.Payment.findOne({ printJobId: job._id });
    if (!payment) {
        payment = await Payment_1.Payment.create({
            printJobId: job._id,
            studentId: job.studentId,
            vendorId: job.vendorId,
            gateway: 'CASHFREE',
            gatewayOrderId: `SIM_${job.publicToken}_${Date.now()}`,
            amount: job.pricing.total,
            currency: 'INR',
            status: 'SUCCESS',
            paidAt: new Date(),
            paymentMethod: 'upi',
        });
    }
    else {
        payment.status = 'SUCCESS';
        payment.paidAt = new Date();
        payment.paymentMethod = 'upi';
        await payment.save();
    }
    await transitionJobToPaid(job._id.toString(), job.studentId.toString(), job.vendorId?.toString());
    res.json({
        success: true,
        data: {
            message: 'Payment simulation successful',
            jobStatus: 'QUEUED',
            orderId: payment.gatewayOrderId,
        },
    });
});
//# sourceMappingURL=paymentController.js.map