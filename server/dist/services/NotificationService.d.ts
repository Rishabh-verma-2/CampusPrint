export declare class NotificationService {
    static create(userId: string, type: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<import("mongoose").Document<unknown, {}, import("../models/Notification").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/Notification").INotification & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    static getForUser(userId: string, limit?: number): Promise<(import("../models/Notification").INotification & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static markRead(notificationId: string, userId: string): Promise<(import("mongoose").Document<unknown, {}, import("../models/Notification").INotification, {}, import("mongoose").DefaultSchemaOptions> & import("../models/Notification").INotification & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    static markAllRead(userId: string): Promise<import("mongoose").UpdateWriteOpResult>;
}
//# sourceMappingURL=NotificationService.d.ts.map