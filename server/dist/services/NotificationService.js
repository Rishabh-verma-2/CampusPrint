"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const Notification_1 = require("../models/Notification");
const socketManager_1 = require("../sockets/socketManager");
class NotificationService {
    static async create(userId, type, title, message, metadata) {
        const notification = await Notification_1.Notification.create({
            userId,
            type,
            title,
            message,
            metadata,
        });
        // Emit real-time notification via Socket.IO
        try {
            const io = (0, socketManager_1.getIO)();
            io.to(`student:${userId}`).to(`vendor:${userId}`).emit('notification:new', {
                notification,
            });
        }
        catch (err) {
            // Socket not initialized in some test scenarios
        }
        return notification;
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