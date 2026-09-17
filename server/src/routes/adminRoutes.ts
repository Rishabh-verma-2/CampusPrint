import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import {
  getAdminDashboard,
  getUniversities,
  getUniversityById,
  createUniversity,
  getCampuses,
  createCampus,
  getAdminVendors,
  updateVendorStatus,
  approveVendor,
  suspendVendor,
  getUsers,
  getStudentDetails,
  deactivateUser,
  getAdminOrders,
  getAdminOrderById,
  getAdminPayments,
  getComplaints,
  updateComplaint,
  getAdminAnalytics,
  getAuditLogs,
  getAdminSettings,
  updateAdminSettings,
} from '../controllers/adminController';

const router = Router();

// All admin routes require admin role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', getAdminDashboard);

// Universities & Campuses
router.get('/universities', getUniversities);
router.get('/universities/:id', getUniversityById);
router.post('/universities', createUniversity);
router.get('/campuses', getCampuses);
router.post('/campuses', createCampus);

// Vendors
router.get('/vendors', getAdminVendors);
router.patch('/vendors/:id/status', updateVendorStatus);
router.post('/vendors/:id/approve', approveVendor);
router.post('/vendors/:id/suspend', suspendVendor);

// Students / Users
router.get('/students', getUsers);
router.get('/students/:id', getStudentDetails);
router.get('/users', getUsers);
router.patch('/users/:id/deactivate', deactivateUser);

// Orders
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrderById);

// Payments
router.get('/payments', getAdminPayments);

// Complaints
router.get('/complaints', getComplaints);
router.patch('/complaints/:id', updateComplaint);

// Analytics
router.get('/analytics', getAdminAnalytics);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

// Settings
router.get('/settings', getAdminSettings);
router.patch('/settings', updateAdminSettings);

export default router;
