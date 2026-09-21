import { Router } from 'express';
import { authenticate, requireStudent, requireVendor } from '../middleware/authenticate';
import {
  createPrintJob, getMyPrintJobs, getPrintJob, downloadPrintJobFile,
  acceptPrintJob, startPrinting, markReady,
  cancelPrintJob, collectPrintJob, verifyPickupToken, reportProblem,
  getJobPaymentStatus, getQueuePosition,
} from '../controllers/printJobController';

const router = Router();

// Student
router.post('/', authenticate, requireStudent, createPrintJob);
router.get('/', authenticate, getMyPrintJobs);
// Payment status for a specific print job — GET /api/print-jobs/:id/payment-status
// Queue position for a specific print job — GET /api/print-jobs/:id/queue-position
// Must be registered BEFORE /:id to avoid route shadowing
router.get('/:id/payment-status', authenticate, getJobPaymentStatus);
router.get('/:id/queue-position', authenticate, getQueuePosition);
router.get('/:id', authenticate, getPrintJob);
router.get('/:id/file', authenticate, downloadPrintJobFile);
router.post('/:id/cancel', authenticate, cancelPrintJob);

// Vendor
router.post('/:id/accept', authenticate, requireVendor, acceptPrintJob);
router.post('/:id/start', authenticate, requireVendor, startPrinting);
router.post('/:id/ready', authenticate, requireVendor, markReady);
router.post('/:id/collect', authenticate, requireVendor, collectPrintJob);
router.post('/:id/report-problem', authenticate, requireVendor, reportProblem);

// Pickup token verification
router.post('/verify-token', authenticate, requireVendor, verifyPickupToken);

export default router;
