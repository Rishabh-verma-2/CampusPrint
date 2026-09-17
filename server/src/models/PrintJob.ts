import mongoose, { Document, Schema } from 'mongoose';
import {
  PrintJobStatus,
  PrintConfig,
  PriceSnapshot,
  PriceBreakdown,
} from '../types';

export interface IPrintJob extends Document {
  publicToken: string;
  studentId: mongoose.Types.ObjectId;
  customerName: string;
  customerIdentifier: string;
  customerPhone?: string;
  customerEnrollment?: string;
  vendorId: mongoose.Types.ObjectId;
  universityId: mongoose.Types.ObjectId;
  campusId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  documentIds?: mongoose.Types.ObjectId[];
  status: PrintJobStatus;
  printConfig: PrintConfig;
  priceSnapshot: PriceSnapshot;
  pricing: PriceBreakdown;
  paymentId?: mongoose.Types.ObjectId;
  // Timestamps
  acceptedAt?: Date;
  printingStartedAt?: Date;
  readyAt?: Date;
  collectedAt?: Date;
  cancelledAt?: Date;
  failedAt?: Date;
  // Meta
  problemNote?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const printJobSchema = new Schema<IPrintJob>(
  {
    publicToken: { type: String, required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true, trim: true },
    customerIdentifier: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    customerEnrollment: { type: String, trim: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    status: {
      type: String,
      enum: [
        'PAYMENT_PENDING',
        'PAID',
        'QUEUED',
        'ACCEPTED',
        'PRINTING',
        'READY',
        'COLLECTED',
        'CANCELLED',
        'FAILED',
        'REFUNDED',
      ],
      default: 'PAYMENT_PENDING',
    },
    printConfig: {
      colorMode: { type: String, enum: ['BW', 'COLOR'], required: true },
      sides: { type: String, enum: ['SINGLE', 'DOUBLE'], required: true },
      copies: { type: Number, required: true, min: 1 },
      pageRanges: { type: String, required: true, default: 'all' },
      totalPages: { type: Number, required: true },
    },
    priceSnapshot: {
      bwPerPage: { type: Number, required: true },
      colorPerPage: { type: Number, required: true },
      duplexDiscount: { type: Number, default: 0 },
    },
    pricing: {
      subtotal: { type: Number, required: true },
      platformFee: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      total: { type: Number, required: true },
      vendorAmount: { type: Number, required: true },
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    acceptedAt: { type: Date },
    printingStartedAt: { type: Date },
    readyAt: { type: Date },
    collectedAt: { type: Date },
    cancelledAt: { type: Date },
    failedAt: { type: Date },
    problemNote: { type: String },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

// Indexes for high-frequency queries
printJobSchema.index({ vendorId: 1, status: 1 });
printJobSchema.index({ studentId: 1, createdAt: -1 });
printJobSchema.index({ campusId: 1, createdAt: -1 });
printJobSchema.index({ universityId: 1, createdAt: -1 });
printJobSchema.index({ paymentId: 1 });
printJobSchema.index({ createdAt: -1 });

export const PrintJob = mongoose.model<IPrintJob>('PrintJob', printJobSchema);
