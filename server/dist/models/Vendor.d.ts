import mongoose, { Document } from 'mongoose';
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
export declare const Vendor: mongoose.Model<IVendor, {}, {}, {}, mongoose.Document<unknown, {}, IVendor, {}, mongoose.DefaultSchemaOptions> & IVendor & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IVendor>;
//# sourceMappingURL=Vendor.d.ts.map