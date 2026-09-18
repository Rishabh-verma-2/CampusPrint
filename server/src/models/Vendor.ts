import mongoose, { Document, Schema } from 'mongoose';
import { VendorStatus, VendorAvailability, VendorPricing, OperatingHours } from '../types';

export interface IVendor extends Document {
  userId: mongoose.Types.ObjectId;
  shopName: string;
  ownerName: string;
  universityId: mongoose.Types.ObjectId;
  campusId: mongoose.Types.ObjectId;
  address: string;
  phone: string;
  logo?: string;
  profileImage?: string;
  status: VendorStatus;
  availability: VendorAvailability;
  operatingHours: OperatingHours;
  pricing: VendorPricing;
  qrCode?: string;
  rating: number;
  totalRatings: number;
  portalPassword?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    shopName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    logo: { type: String },
    profileImage: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ACTIVE'],
      default: 'PENDING',
    },
    availability: {
      type: String,
      enum: ['OPEN', 'CLOSED', 'UNAVAILABLE'],
      default: 'CLOSED',
    },
    operatingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '21:00' },
      days: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    },
    pricing: {
      bwPerPage: { type: Number, default: 1 },
      colorPerPage: { type: Number, default: 5 },
      duplexDiscount: { type: Number, default: 0 },
    },
    qrCode: { type: String },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    portalPassword: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

vendorSchema.index({ campusId: 1, status: 1 });
vendorSchema.index({ universityId: 1 });

export const Vendor = mongoose.model<IVendor>('Vendor', vendorSchema);
