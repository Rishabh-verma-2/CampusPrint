"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const Notification_1 = require("../models/Notification");
const socketManager_1 = require("../sockets/socketManager");
class NotificationService {
    static async create(userId, type, title, message, metadata) {
        let targetUserId = userId;
        if (userId && typeof userId === 'object') {
            targetUserId = (userId._id || userId.id || userId).toString();
        }
        else if (typeof userId === 'string') {
            const match = userId.match(/[0-9a-fA-F]{24}/);
            if (match) {
                targetUserId = match[0];
            }
        }
        try {
            const notification = await Notification_1.Notification.create({
                userId: targetUserId,
                type,
                title,
                message,
                metadata,
            });
            // Emit real-time notification via Socket.IO
            try {
                const io = (0, socketManager_1.getIO)();
                io.to(`student:${targetUserId}`).to(`vendor:${targetUserId}`).emit('notification:new', {
                    notification,
                });
            }
            catch (err) {
                // Socket not initialized in some test scenarios
            }
            return notification;
        }
        catch (err) {
            console.warn(`[NotificationService] Failed to create notification for ${targetUserId}:`, err?.message);
            return null;
        }
    }
    static async getForUser(userId, limit = 20) {
        return Notification_1.Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }
    static async markRead(notificationId, userId) {
        return Notification_1.Notification.findOneAndUpdate({ _id: notificationId, userId }, { read: true }, { new: true });
    }
    static async markAllRead(userId) {
        return Notification_1.Notification.updateMany({ userId, read: false }, { read: true });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map