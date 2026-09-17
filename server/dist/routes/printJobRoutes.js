"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const printJobController_1 = require("../controllers/printJobController");
const router = (0, express_1.Router)();
// Student
router.post('/', authenticate_1.authenticate, authenticate_1.requireStudent, printJobController_1.createPrintJob);
router.get('/', authenticate_1.authenticate, printJobController_1.getMyPrintJobs);
router.get('/:id', authenticate_1.authenticate, printJobController_1.getPrintJob);
router.post('/:id/cancel', authenticate_1.authenticate, printJobController_1.cancelPrintJob);
// Vendor
router.post('/:id/accept', authenticate_1.authenticate, authenticate_1.requireVendor, printJobController_1.acceptPrintJob);
router.post('/:id/start', authenticate_1.authenticate, authenticate_1.requireVendor, printJobController_1.startPrinting);
router.post('/:id/ready', authenticate_1.authenticate, authenticate_1.requireVendor, printJobController_1.markReady);
router.post('/:id/collect', authenticate_1.authenticate, authenticate_1.requireVendor, printJobController_1.collectPrintJob);
router.post('/:id/report-problem', authenticate_1.authenticate, authenticate_1.requireVendor, printJobController_1.reportProblem);
// Pickup token verification
router.post('/verify-token', authenticate_1.authenticate, authenticate_1.requireVendor, printJobController_1.verifyPickupToken);
exports.default = router;
//# sourceMappingURL=printJobRoutes.js.map