"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const vendorController_1 = require("../controllers/vendorController");
const router = (0, express_1.Router)();
// Public
router.get('/', vendorController_1.getVendors);
router.get('/:id', vendorController_1.getVendorById);
router.get('/:id/pricing', vendorController_1.getVendorPricing);
// Vendor-protected
router.get('/me/dashboard', authenticate_1.authenticate, authenticate_1.requireVendor, vendorController_1.getVendorDashboard);
router.get('/me/profile', authenticate_1.authenticate, authenticate_1.requireVendor, vendorController_1.getVendorProfile);
router.get('/me/queue', authenticate_1.authenticate, authenticate_1.requireVendor, vendorController_1.getVendorQueue);
router.get('/me/analytics', authenticate_1.authenticate, authenticate_1.requireVendor, vendorController_1.getVendorAnalytics);
router.patch('/me/pricing', authenticate_1.authenticate, authenticate_1.requireVendor, vendorController_1.updateVendorPricing);
router.patch('/me/availability', authenticate_1.authenticate, authenticate_1.requireVendor, vendorController_1.updateVendorAvailability);
router.patch('/me/profile', authenticate_1.authenticate, authenticate_1.requireVendor, vendorController_1.updateVendorProfile);
exports.default = router;
//# sourceMappingURL=vendorRoutes.js.map