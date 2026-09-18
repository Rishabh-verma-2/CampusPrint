"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
// All admin routes require admin role
router.use(authenticate_1.authenticate, authenticate_1.requireAdmin);
// Dashboard
router.get('/dashboard', adminController_1.getAdminDashboard);
// Universities & Campuses
router.get('/universities', adminController_1.getUniversities);
router.get('/universities/:id', adminController_1.getUniversityById);
router.post('/universities', adminController_1.createUniversity);
router.get('/campuses', adminController_1.getCampuses);
router.post('/campuses', adminController_1.createCampus);
// Vendors
router.get('/vendors', adminController_1.getAdminVendors);
router.post('/vendors', adminController_1.createVendor);
router.patch('/vendors/:id/status', adminController_1.updateVendorStatus);
router.post('/vendors/:id/approve', adminController_1.approveVendor);
router.post('/vendors/:id/suspend', adminController_1.suspendVendor);
router.get('/vendors/:id/credentials', adminController_1.getVendorCredentials);
// Students / Users
router.get('/students', adminController_1.getUsers);
router.get('/students/:id', adminController_1.getStudentDetails);
router.get('/users', adminController_1.getUsers);
router.patch('/users/:id/deactivate', adminController_1.deactivateUser);
// Orders
router.get('/orders', adminController_1.getAdminOrders);
router.get('/orders/:id', adminController_1.getAdminOrderById);
// Payments
router.get('/payments', adminController_1.getAdminPayments);
// Complaints
router.get('/complaints', adminController_1.getComplaints);
router.patch('/complaints/:id', adminController_1.updateComplaint);
// Analytics
router.get('/analytics', adminController_1.getAdminAnalytics);
// Audit Logs
router.get('/audit-logs', adminController_1.getAuditLogs);
// Settings
router.get('/settings', adminController_1.getAdminSettings);
router.patch('/settings', adminController_1.updateAdminSettings);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map