import { Router } from 'express';
import { authenticate, requireVendor } from '../middleware/authenticate';
import {
  getVendors, getVendorById, getVendorPricing,
  getVendorDashboard, getVendorQueue,
  updateVendorPricing, updateVendorAvailability, updateVendorProfile,
  getVendorAnalytics,
} from '../controllers/vendorController';

const router = Router();

// Public
router.get('/', getVendors);
router.get('/:id', getVendorById);
router.get('/:id/pricing', getVendorPricing);

// Vendor-protected
router.get('/me/dashboard', authenticate, requireVendor, getVendorDashboard);
router.get('/me/queue', authenticate, requireVendor, getVendorQueue);
router.get('/me/analytics', authenticate, requireVendor, getVendorAnalytics);
router.patch('/me/pricing', authenticate, requireVendor, updateVendorPricing);
router.patch('/me/availability', authenticate, requireVendor, updateVendorAvailability);
router.patch('/me/profile', authenticate, requireVendor, updateVendorProfile);

export default router;
