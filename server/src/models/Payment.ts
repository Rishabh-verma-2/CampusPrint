import mongoose, { Document, Schema } from 'mongoose';
import { PaymentStatus } from '../types';

export interface IPayment extends Document {
  printJobId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  gateway: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  signature?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    printJobId: { type: Schema.Types.ObjectId, ref: 'PrintJob', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gateway: { type: String, required: true, default: 'MOCK' },
    gatewayOrderId: { type: String, required: true, unique: true },
    gatewayPaymentId: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
      default: 'CREATED',
    },
    signature: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ printJobId: 1 });
paymentSchema.index({ studentId: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
