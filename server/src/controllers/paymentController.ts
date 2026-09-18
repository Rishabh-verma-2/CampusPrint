import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { PrintJob } from '../models/PrintJob';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { getIO } from '../sockets/socketManager';
import { NotificationService } from '../services/NotificationService';
import { CashfreeService } from '../services/CashfreeService';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

// ─── Create Payment Order ──────────────────────────────────────────────────────
// POST /api/payments/create-order
// Frontend sends: { printJobId }
// Backend recalculates amount from PrintJob — frontend amount is NEVER trusted.

export const createPaymentOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { printJobId } = req.body;

  if (!printJobId) throw createError('printJobId is required', 400, 'MISSING_JOB_ID');

  // 1. Find and validate the PrintJob
  const job = await PrintJob.findById(printJobId);
  if (!job) throw createError('Print job not found', 404, 'JOB_NOT_FOUND');

  // 2. Verify the requesting student owns this job
  if (job.studentId.toString() !== req.user!._id) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }

  // 3. Verify job is in PAYMENT_PENDING state
  if (job.status !== 'PAYMENT_PENDING') {
    throw createError(
      `Job cannot be paid in its current state: ${job.status}`,
      400,
      'INVALID_STATE'
    );
  }

  // 4. Verify amount is valid (server-side only — from the saved pricing)
  const amount = job.pricing.total;
  if (!amount || amount <= 0) {
    throw createError('Invalid payment amount', 400, 'INVALID_AMOUNT');
  }

  // 5. Duplicate payment protection: check for existing successful payment
  const existingPayment = await Payment.findOne({ printJobId: job._id });
  if (existingPayment) {
    if (existingPayment.status === 'SUCCESS') {
      throw createError('Payment already completed for this job', 400, 'ALREADY_PAID');
    }
    // If a PENDING payment exists, return its session (idempotency)
    // Only return if it was created recently (within 30 min) to avoid stale sessions
    if (existingPayment.status === 'PENDING' || existingPayment.status === 'CREATED') {
      const ageMs = Date.now() - existingPayment.createdAt.getTime();
      if (ageMs < 30 * 60 * 1000) {
        console.log(`[Payment] Returning existing payment session for job ${printJobId}`);
        // Refresh Cashfree order to get a valid session
        try {
          const cfOrder = await CashfreeService.getOrder(existingPayment.gatewayOrderId);
          if (cfOrder.payment_session_id) {
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
        } catch {
          // If we can't refresh, fall through to create new order
        }
      }
      // Expired/dropped payment — update to CANCELLED and create fresh
      existingPayment.status = 'CANCELLED';
      await existingPayment.save();
    }
  }

  // 6. Get student details for Cashfree customer object
  const student = await User.findById(req.user!._id);
  const studentProfile = await StudentProfile.findOne({ userId: req.user!._id });

  const customerPhone = (student?.phone || '9999999999').replace(/\D/g, '').slice(-10).padStart(10, '9');
  const customerEmail = student?.email || `student_${req.user!._id.slice(-6)}@campusprint.app`;
  const customerName = student?.name || 'Student';
  const customerId = `CP_STU_${req.user!._id.slice(-8)}`;

  // 7. Generate a unique Cashfree order ID
  // Format: CP_<jobToken>_<8charUUID> (safe for Cashfree: alphanumeric + underscore)
  const shortToken = job.publicToken.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const uniqueSuffix = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
  const cfOrderId = `CP_${shortToken}_${uniqueSuffix}`;

  // 8. Build Cashfree order
  const returnUrl = `${env.FRONTEND_URL}/payment/return?order_id=${cfOrderId}`;
  const notifyUrl = `${env.BACKEND_URL}/api/payments/webhook`;

  console.log(`[Payment] Creating Cashfree order for job ${printJobId} | Amount: ₹${amount} | OrderId: ${cfOrderId}`);

  // 9. Create order in Cashfree
  let cfOrder;
  try {
    cfOrder = await CashfreeService.createOrder({
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
        payment_methods: 'upi', // RESTRICT TO UPI ONLY
      },
      orderNote: `CampusPrint - ${job.publicToken}`,
    });
  } catch (err: any) {
    console.error('[Payment] Cashfree createOrder failed:', err.message);
    throw createError(
      'Payment gateway error. Please try again.',
      502,
      'GATEWAY_ERROR'
    );
  }

  // 10. Create local Payment record
  const payment = await Payment.create({
    printJobId: job._id,
    studentId: req.user!._id,
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

  console.log(`[Payment] Payment record created: ${payment._id} | Cashfree session ready`);

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

// ─── Get Payment Status (by our internal orderId) ─────────────────────────────
// GET /api/payments/status/:orderId
// Used by return page to verify actual payment status from Cashfree

export const getPaymentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = req.params.orderId as string;

  // Find our local payment record
  const payment = await Payment.findOne({ gatewayOrderId: orderId });
  if (!payment) {
    throw createError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  // Authorization: student can only check their own payments
  if (req.user!.role === 'STUDENT' && payment.studentId.toString() !== req.user!._id) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }

  // If already confirmed as SUCCESS, return immediately
  if (payment.status === 'SUCCESS') {
    const job = await PrintJob.findById(payment.printJobId).select('publicToken status _id');
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
        printJob: job ? { _id: job._id, publicToken: job.publicToken, status: job.status } : null,
      },
    });
  }

  // Fetch actual status from Cashfree API
  let cfStatus: string = payment.status;
  try {
    const payments = await CashfreeService.getOrderPayments(orderId);
    if (payments && payments.length > 0) {
      // Get the most recent payment attempt
      const latestPayment = payments[payments.length - 1];
      const mappedStatus = CashfreeService.mapPaymentStatus(latestPayment.payment_status);

      console.log(`[Payment] Status check for ${orderId}: Cashfree=${latestPayment.payment_status}, mapped=${mappedStatus}`);

      // Update our record if status has changed
      if (mappedStatus !== payment.status) {
        payment.status = mappedStatus as any;
        payment.cashfreeStatus = latestPayment.payment_status;
        if (latestPayment.cf_payment_id) {
          payment.gatewayPaymentId = latestPayment.cf_payment_id;
        }
        if (mappedStatus === 'SUCCESS') {
          payment.paidAt = new Date();
          payment.paymentMethod = 'upi';
          // Transition the PrintJob to QUEUED
          await transitionJobToPaid(payment.printJobId.toString(), payment.studentId.toString(), payment.vendorId?.toString());
        } else if (mappedStatus === 'FAILED') {
          payment.failedAt = new Date();
        } else if (mappedStatus === 'USER_DROPPED') {
          payment.userDroppedAt = new Date();
        }
        await payment.save();
      }

      cfStatus = payment.status;
    }
  } catch (err: any) {
    // Don't fail the request if Cashfree check fails — return cached status
    console.error('[Payment] Error fetching Cashfree status:', err.message);
  }

  const job = await PrintJob.findById(payment.printJobId).select('publicToken status _id');

  res.json({
    success: true,
    data: {
      payment: {
        _id: payment._id,
        status: cfStatus,
        amount: payment.amount,
        gatewayOrderId: payment.gatewayOrderId,
        paidAt: payment.paidAt,
      },
      printJob: job ? { _id: job._id, publicToken: job.publicToken, status: job.status } : null,
    },
  });
});

// ─── Cashfree Webhook ─────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Cashfree sends this asynchronously after payment events.
// Body must be parsed as raw Buffer for signature verification.

export const handlePaymentWebhook = async (req: Request, res: Response): Promise<void> => {
  // Always respond 200 to Cashfree to prevent retries on error
  // Process the event and update our records asynchronously
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  const signature = req.headers['x-webhook-signature'] as string;

  // rawBody is set by express.raw() middleware registered for this route
  const rawBody = (req as any).rawBody as string | undefined;

  console.log(`[Webhook] Received Cashfree webhook | timestamp=${timestamp}`);

  // 1. Verify webhook signature (CRITICAL — reject tampered webhooks)
  if (rawBody && timestamp && signature) {
    const isValid = CashfreeService.verifyWebhookSignature(rawBody, timestamp, signature);
    if (!isValid) {
      console.error('[Webhook] SIGNATURE VERIFICATION FAILED — rejecting webhook');
      res.status(200).json({ success: false, message: 'Invalid signature' });
      return;
    }
    console.log('[Webhook] Signature verified ✅');
  } else {
    // In development/sandbox, Cashfree may not always send signatures
    // Log warning but continue processing
    console.warn('[Webhook] Missing signature headers — processing without verification (dev/sandbox only)');
    if (env.isProd()) {
      res.status(200).json({ success: false, message: 'Missing signature' });
      return;
    }
  }

  // 2. Parse webhook payload
  let payload: Record<string, any>;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    console.error('[Webhook] Failed to parse payload');
    res.status(200).json({ success: true }); // Still 200 to prevent retries
    return;
  }

  // 3. Extract event data
  // Cashfree webhook structure: { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: {...}, payment: {...} } }
  const eventType = payload?.type as string;
  const orderData = payload?.data?.order;
  const paymentData = payload?.data?.payment;

  console.log(`[Webhook] Event type: ${eventType} | OrderId: ${orderData?.order_id}`);

  if (!orderData?.order_id) {
    console.warn('[Webhook] No order_id in payload');
    res.status(200).json({ success: true });
    return;
  }

  const cfOrderId = orderData.order_id;

  // 4. Find our local payment record
  const payment = await Payment.findOne({ gatewayOrderId: cfOrderId });
  if (!payment) {
    console.warn(`[Webhook] Unknown order: ${cfOrderId}`);
    res.status(200).json({ success: true, message: 'Unknown order' });
    return;
  }

  // 5. Idempotency: already processed successfully
  if (payment.status === 'SUCCESS') {
    console.log(`[Webhook] Already processed for order ${cfOrderId}`);
    res.status(200).json({ success: true, message: 'Already processed' });
    return;
  }

  // 6. Update webhook received timestamp
  payment.webhookReceivedAt = new Date();

  // 7. Map Cashfree event to our status
  const cfPaymentStatus = paymentData?.payment_status as string;
  const mappedStatus = CashfreeService.mapPaymentStatus(cfPaymentStatus || eventType?.replace('_WEBHOOK', '') || '');

  console.log(`[Webhook] Payment status: Cashfree=${cfPaymentStatus}, mapped=${mappedStatus} | Order=${cfOrderId}`);

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

    // Transition PrintJob to QUEUED
    await transitionJobToPaid(
      payment.printJobId.toString(),
      payment.studentId.toString(),
      payment.vendorId?.toString()
    );
  } else if (mappedStatus === 'FAILED') {
    payment.status = 'FAILED';
    payment.failedAt = new Date();
    await payment.save();
  } else if (mappedStatus === 'USER_DROPPED') {
    payment.status = 'USER_DROPPED';
    payment.userDroppedAt = new Date();
    await payment.save();
  } else if (mappedStatus === 'CANCELLED') {
    payment.status = 'CANCELLED';
    await payment.save();
  } else {
    payment.status = 'PENDING';
    await payment.save();
  }

  res.status(200).json({ success: true });
};

// ─── Get Payment ───────────────────────────────────────────────────────────────
// GET /api/payments/:id

export const getPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw createError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

  if (req.user!.role === 'STUDENT' && payment.studentId.toString() !== req.user!._id) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }

  res.json({ success: true, data: { payment } });
});

// ─── Get Payment by Job ────────────────────────────────────────────────────────
// GET /api/payments/by-job/:jobId

export const getPaymentByJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.jobId);
  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');

  if (job.studentId.toString() !== req.user!._id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }

  const payment = await Payment.findOne({ printJobId: job._id });
  res.json({ success: true, data: { payment } });
});

// ─── Internal: Transition PrintJob to paid/queued ─────────────────────────────

async function transitionJobToPaid(
  printJobId: string,
  studentId: string,
  vendorId?: string
): Promise<void> {
  try {
    const job = await PrintJob.findById(printJobId);
    if (!job) {
      console.error(`[Payment] Job not found for transition: ${printJobId}`);
      return;
    }

    if (job.status !== 'PAYMENT_PENDING') {
      console.warn(`[Payment] Job ${printJobId} is not in PAYMENT_PENDING state (current: ${job.status}), skipping transition`);
      return;
    }

    // Transition: PAYMENT_PENDING → QUEUED
    // (We go directly to QUEUED as per existing state machine: PAYMENT_PENDING → PAID → QUEUED)
    // Using QUEUED directly since the vendor dashboard filters by QUEUED status
    job.status = 'QUEUED';
    await job.save();

    console.log(`[Payment] ✅ Job ${job.publicToken} → QUEUED after successful payment`);

    // Notify vendor via socket
    try {
      const io = getIO();
      io.to(`vendor:${job.vendorId.toString()}`).emit('printJob:new', { job });
      io.to(`student:${studentId}`).emit('printJob:updated', { job });
    } catch {
      // Socket not initialized or vendor not connected
    }

    // Notify student
    await NotificationService.create(
      studentId,
      'PAYMENT_SUCCESS',
      '✅ Payment Successful',
      `Payment confirmed for ${job.publicToken}. Your order is in the vendor's queue.`,
      { jobId: job._id, token: job.publicToken }
    );

    // Notify vendor
    if (vendorId) {
      try {
        const { Vendor } = await import('../models/Vendor');
        const vendor = await Vendor.findById(vendorId);
        if (vendor) {
          await NotificationService.create(
            vendor.userId.toString(),
            'JOB_QUEUED',
            '🖨️ New Print Job',
            `New paid print job ${job.publicToken} is waiting in your queue.`,
            { jobId: job._id, token: job.publicToken }
          );
        }
      } catch {
        // Ignore notification errors
      }
    }
  } catch (err) {
    console.error('[Payment] Error transitioning job to QUEUED:', err);
  }
}
