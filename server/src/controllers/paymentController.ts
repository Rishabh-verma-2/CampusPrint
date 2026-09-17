import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { PrintJob } from '../models/PrintJob';
import { Payment } from '../models/Payment';
import { getIO } from '../sockets/socketManager';
import { NotificationService } from '../services/NotificationService';
import { v4 as uuidv4 } from 'uuid';

// ─── Create Payment Order ──────────────────────────────────────────────────────

export const createPaymentOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { printJobId } = req.body;

  const job = await PrintJob.findById(printJobId);
  if (!job) throw createError('Print job not found', 404, 'JOB_NOT_FOUND');
  if (job.studentId.toString() !== req.user!._id) throw createError('Forbidden', 403, 'FORBIDDEN');
  if (job.status !== 'PAYMENT_PENDING') throw createError('Job is not in payment pending state', 400, 'INVALID_STATE');

  // Idempotency: Check if payment already created for this job
  const existingPayment = await Payment.findOne({ printJobId: job._id });
  if (existingPayment && existingPayment.status === 'SUCCESS') {
    throw createError('Payment already completed', 400, 'ALREADY_PAID');
  }

  const gatewayOrderId = `CP_ORDER_${uuidv4()}`;

  // Mock payment: return a fake order ID that client uses to call mock-verify
  const payment = await Payment.create({
    printJobId: job._id,
    studentId: req.user!._id,
    gateway: 'MOCK',
    gatewayOrderId,
    amount: job.pricing.total,
    currency: 'INR',
    status: 'CREATED',
  });

  job.paymentId = payment._id;
  await job.save();

  res.status(201).json({
    success: true,
    data: {
      payment: {
        _id: payment._id,
        gatewayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        gateway: payment.gateway,
      },
      // In real Cashfree integration, this would be payment_session_id
      paymentSessionId: `mock_session_${gatewayOrderId}`,
    },
  });
});

// ─── Mock Webhook / Payment Success ───────────────────────────────────────────
// In production: this is the Cashfree webhook endpoint with signature verification.
// For mock: frontend calls this directly after simulating payment.

export const handlePaymentWebhook = asyncHandler(async (req: AuthRequest, res: Response) => {
  // In production: verify Cashfree signature from headers
  // const signature = req.headers['x-webhook-signature'];
  // CashfreeProvider.verifyWebhookSignature(payload, signature);

  const { gatewayOrderId, gatewayPaymentId, status } = req.body;

  const payment = await Payment.findOne({ gatewayOrderId });
  if (!payment) {
    // Respond 200 to gateway even if not found (avoid retries on unknown orders)
    res.json({ success: true, message: 'Unknown order' });
    return;
  }

  // Idempotency: already processed
  if (payment.status === 'SUCCESS') {
    res.json({ success: true, message: 'Already processed' });
    return;
  }

  if (status === 'SUCCESS' || status === 'PAID') {
    payment.status = 'SUCCESS';
    payment.gatewayPaymentId = gatewayPaymentId || `mock_pay_${Date.now()}`;
    await payment.save();

    // Transition job: PAYMENT_PENDING → PAID → QUEUED
    const job = await PrintJob.findById(payment.printJobId);
    if (job && job.status === 'PAYMENT_PENDING') {
      job.status = 'QUEUED';
      await job.save();

      // Notify vendor
      try {
        const io = getIO();
        io.to(`vendor:${job.vendorId.toString()}`).emit('printJob:new', { job });
      } catch (e) {}

      // Notify student
      await NotificationService.create(
        job.studentId.toString(),
        'PAYMENT_SUCCESS',
        '✅ Payment Successful',
        `Payment confirmed for ${job.publicToken}. Your order is now in the queue.`,
        { jobId: job._id, token: job.publicToken }
      );
    }
  } else {
    payment.status = 'FAILED';
    await payment.save();
  }

  res.json({ success: true });
});

// ─── Get Payment ───────────────────────────────────────────────────────────────

export const getPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw createError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

  if (req.user!.role === 'STUDENT' && payment.studentId.toString() !== req.user!._id) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }

  res.json({ success: true, data: { payment } });
});

// ─── Get Payment by Job ────────────────────────────────────────────────────────

export const getPaymentByJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.jobId);
  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');

  if (job.studentId.toString() !== req.user!._id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }

  const payment = await Payment.findOne({ printJobId: job._id });
  res.json({ success: true, data: { payment } });
});
