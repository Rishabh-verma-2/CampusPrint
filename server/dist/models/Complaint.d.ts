import mongoose, { Document } from 'mongoose';
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
export declare const Complaint: mongoose.Model<IComplaint, {}, {}, {}, mongoose.Document<unknown, {}, IComplaint, {}, mongoose.DefaultSchemaOptions> & IComplaint & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IComplaint>;
//# sourceMappingURL=Complaint.d.ts.map