import mongoose, { Document } from 'mongoose';
import { PaymentStatus } from '../types';
export interface IPayment extends Document {
    printJobId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    vendorId?: mongoose.Types.ObjectId;
    gateway: string;
    gatewayOrderId: string;
    gatewayPaymentId?: string;
    amount: number;
    currency: string;
    paymentMethod?: string;
    status: PaymentStatus;
    cashfreeStatus?: string;
    paidAt?: Date;
    failedAt?: Date;
    webhookReceivedAt?: Date;
    userDroppedAt?: Date;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Payment: mongoose.Model<IPayment, {}, {}, {}, mongoose.Document<unknown, {}, IPayment, {}, mongoose.DefaultSchemaOptions> & IPayment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPayment>;
//# sourceMappingURL=Payment.d.ts.map