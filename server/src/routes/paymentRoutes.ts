import { Router } from 'express';
import { authenticate, requireStudent } from '../middleware/authenticate';
import {
  createPaymentOrder, handlePaymentWebhook, getPayment, getPaymentByJob,
} from '../controllers/paymentController';

const router = Router();

router.post('/create-order', authenticate, requireStudent, createPaymentOrder);
router.post('/webhook', handlePaymentWebhook); // No auth — gateway sends this
router.get('/:id', authenticate, getPayment);
router.get('/by-job/:jobId', authenticate, getPaymentByJob);

export default router;
