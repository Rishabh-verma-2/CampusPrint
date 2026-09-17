"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const paymentController_1 = require("../controllers/paymentController");
const router = (0, express_1.Router)();
router.post('/create-order', authenticate_1.authenticate, authenticate_1.requireStudent, paymentController_1.createPaymentOrder);
router.post('/webhook', paymentController_1.handlePaymentWebhook); // No auth — gateway sends this
router.get('/:id', authenticate_1.authenticate, paymentController_1.getPayment);
router.get('/by-job/:jobId', authenticate_1.authenticate, paymentController_1.getPaymentByJob);
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map