import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { authenticate, requireStudent } from '../middleware/authenticate';
import {
  createPaymentOrder,
  handlePaymentWebhook,
  getPayment,
  getPaymentByJob,
  getPaymentStatus,
  simulatePaymentSuccess,
} from '../controllers/paymentController';

const router = Router();

// ─── Webhook ───────────────────────────────────────────────────────────────────
// Must use express.raw() BEFORE express.json() for this route to capture raw body
// for Cashfree webhook signature verification.
// We save rawBody to req.rawBody for use in the controller.

const rawBodyCapture = (req: Request, _res: Response, next: NextFunction): void => {
  express.raw({ type: 'application/json' })(req, _res, (err) => {
    if (err) return next(err);
    if (Buffer.isBuffer(req.body)) {
      (req as any).rawBody = req.body.toString('utf-8');
      // Parse the body for controller usage
      try {
        req.body = JSON.parse((req as any).rawBody);
      } catch {
        req.body = {};
      }
    }
    next();
  });
};

// Cashfree webhook — no auth (Cashfree calls this directly)
router.post('/webhook', rawBodyCapture, handlePaymentWebhook);

// ─── Student Routes ────────────────────────────────────────────────────────────

// Create Cashfree payment order for a PrintJob
router.post('/create-order', authenticate, requireStudent, createPaymentOrder);

// Simulate payment success (dev/sandbox testing)
router.post('/simulate-success', authenticate, requireStudent, simulatePaymentSuccess);

// Verify payment status — called by frontend return page
// Fetches actual status from Cashfree API (don't trust query params from Cashfree return URL)
router.get('/status/:orderId', authenticate, getPaymentStatus);

// Get payment by PrintJob ID
router.get('/by-job/:jobId', authenticate, getPaymentByJob);

// Get payment by ID
router.get('/:id', authenticate, getPayment);

export default router;
