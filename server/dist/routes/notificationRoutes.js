"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const errorHandler_1 = require("../middleware/errorHandler");
const NotificationService_1 = require("../services/NotificationService");
const router = (0, express_1.Router)();
router.get('/', authenticate_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const notifications = await NotificationService_1.NotificationService.getForUser(req.user._id, 30);
    res.json({ success: true, data: { notifications } });
}));
router.patch('/:id/read', authenticate_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const n = await NotificationService_1.NotificationService.markRead(req.params.id, req.user._id);
    res.json({ success: true, data: { notification: n } });
}));
router.patch('/mark-all-read', authenticate_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await NotificationService_1.NotificationService.markAllRead(req.user._id);
    res.json({ success: true, message: 'All marked as read' });
}));
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map