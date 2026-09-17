import { Notification } from '../models/Notification';
import { getIO } from '../sockets/socketManager';

export class NotificationService {
  static async create(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      metadata,
    });

    // Emit real-time notification via Socket.IO
    try {
      const io = getIO();
      io.to(`student:${userId}`).to(`vendor:${userId}`).emit('notification:new', {
        notification,
      });
    } catch (err) {
      // Socket not initialized in some test scenarios
    }

    return notification;
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
