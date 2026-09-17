import mongoose, { Document, Schema } from 'mongoose';
import { ComplaintStatus, ComplaintCategory } from '../types';

export interface IComplaint extends Document {
  ticketId: string;
  orderId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  category: ComplaintCategory;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  adminNotes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const complaintSchema = new Schema<IComplaint>(
  {
    ticketId: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'PrintJob', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    category: {
      type: String,
      enum: ['WRONG_PRINT', 'MISSING_PAGES', 'POOR_QUALITY', 'VENDOR_ISSUE', 'PAYMENT_ISSUE', 'OTHER'],
      required: true,
    },
    description: { type: String, required: true },
    attachments: [{ type: String }],
    status: {
      type: String,
      enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'],
      default: 'OPEN',
    },
    adminNotes: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

complaintSchema.index({ studentId: 1 });
complaintSchema.index({ vendorId: 1 });
complaintSchema.index({ orderId: 1 });
complaintSchema.index({ status: 1 });

export const Complaint = mongoose.model<IComplaint>('Complaint', complaintSchema);
