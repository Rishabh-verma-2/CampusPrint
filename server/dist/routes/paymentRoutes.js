"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const authenticate_1 = require("../middleware/authenticate");
const paymentController_1 = require("../controllers/paymentController");
const router = (0, express_1.Router)();
// ─── Webhook ───────────────────────────────────────────────────────────────────
// Must use express.raw() BEFORE express.json() for this route to capture raw body
// for Cashfree webhook signature verification.
// We save rawBody to req.rawBody for use in the controller.
const rawBodyCapture = (req, _res, next) => {
    express_2.default.raw({ type: 'application/json' })(req, _res, (err) => {
        if (err)
            return next(err);
        if (Buffer.isBuffer(req.body)) {
            req.rawBody = req.body.toString('utf-8');
            // Parse the body for controller usage
            try {
                req.body = JSON.parse(req.rawBody);
            }
            catch {
                req.body = {};
            }
        }
        next();
    });
};
// Cashfree webhook — no auth (Cashfree calls this directly)
router.post('/webhook', rawBodyCapture, paymentController_1.handlePaymentWebhook);
// ─── Student Routes ────────────────────────────────────────────────────────────
// Create Cashfree payment order for a PrintJob
router.post('/create-order', authenticate_1.authenticate, authenticate_1.requireStudent, paymentController_1.createPaymentOrder);
// Simulate payment success (dev/sandbox testing)
router.post('/simulate-success', authenticate_1.authenticate, authenticate_1.requireStudent, paymentController_1.simulatePaymentSuccess);
// Verify payment status — called by frontend return page
// Fetches actual status from Cashfree API (don't trust query params from Cashfree return URL)
router.get('/status/:orderId', authenticate_1.authenticate, paymentController_1.getPaymentStatus);
// Get payment by PrintJob ID
router.get('/by-job/:jobId', authenticate_1.authenticate, paymentController_1.getPaymentByJob);
// Get payment by ID
router.get('/:id', authenticate_1.authenticate, paymentController_1.getPayment);
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map