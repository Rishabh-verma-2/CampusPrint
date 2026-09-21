import { Notification } from '../models/Notification';
import { getIO } from '../sockets/socketManager';

export class NotificationService {
  static async create(
    userId: string | any,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    let targetUserId = userId;
    if (userId && typeof userId === 'object') {
      targetUserId = (userId._id || userId.id || userId).toString();
    } else if (typeof userId === 'string') {
      const match = userId.match(/[0-9a-fA-F]{24}/);
      if (match) {
        targetUserId = match[0];
      }
    }

    try {
      const notification = await Notification.create({
        userId: targetUserId,
        type,
        title,
        message,
        metadata,
      });

      // Emit real-time notification via Socket.IO
      try {
        const io = getIO();
        io.to(`student:${targetUserId}`).to(`vendor:${targetUserId}`).emit('notification:new', {
          notification,
        });
      } catch (err) {
        // Socket not initialized in some test scenarios
      }

      return notification;
    } catch (err: any) {
      console.warn(`[NotificationService] Failed to create notification for ${targetUserId}:`, err?.message);
      return null;
    }
  }

  static async getForUser(userId: string, limit = 20) {
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async markRead(notificationId: string, userId: string) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );
  }

  static async markAllRead(userId: string) {
    return Notification.updateMany({ userId, read: false }, { read: true });
  }
}
