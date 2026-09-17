import { Router } from 'express';
import { authenticate, requireStudent, requireVendor } from '../middleware/authenticate';
import {
  createPrintJob, getMyPrintJobs, getPrintJob,
  acceptPrintJob, startPrinting, markReady,
  cancelPrintJob, collectPrintJob, verifyPickupToken, reportProblem,
} from '../controllers/printJobController';

const router = Router();

// Student
router.post('/', authenticate, requireStudent, createPrintJob);
router.get('/', authenticate, getMyPrintJobs);
router.get('/:id', authenticate, getPrintJob);
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
