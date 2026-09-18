import mongoose, { Document, Schema } from 'mongoose';
import { PaymentStatus } from '../types';

export interface IPayment extends Document {
  printJobId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  // Gateway fields
  gateway: string;
  gatewayOrderId: string;   // Our internal order ID (CP_xxx) = Cashfree order_id
  gatewayPaymentId?: string; // Cashfree cf_payment_id (assigned after payment)
  // Amounts
  amount: number;
  currency: string;
  paymentMethod?: string; // 'upi' etc
  // Status
  status: PaymentStatus;
  cashfreeStatus?: string; // Raw Cashfree payment status for debugging
  // Timestamps
  paidAt?: Date;
  failedAt?: Date;
  webhookReceivedAt?: Date;
  userDroppedAt?: Date;
  // Misc
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    printJobId: { type: Schema.Types.ObjectId, ref: 'PrintJob', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    gateway: { type: String, required: true, default: 'CASHFREE' },
    gatewayOrderId: { type: String, required: true, unique: true },
    gatewayPaymentId: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String },
    status: {
      type: String,
      enum: [
        'CREATED',
        'PENDING',
        'SUCCESS',
        'FAILED',
        'USER_DROPPED',
        'CANCELLED',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
      ],
      default: 'CREATED',
    },
    cashfreeStatus: { type: String }, // Raw Cashfree status string
    paidAt: { type: Date },
    failedAt: { type: Date },
    webhookReceivedAt: { type: Date },
    userDroppedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ printJobId: 1 });
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ gatewayOrderId: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
