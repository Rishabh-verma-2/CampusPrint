import mongoose, { Document } from 'mongoose';
import { PrintJobStatus, PrintConfig, PriceSnapshot, PriceBreakdown } from '../types';
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
    originalDocumentId?: mongoose.Types.ObjectId;
    isCustomPdf?: boolean;
    status: PrintJobStatus;
    printConfig: PrintConfig;
    priceSnapshot: PriceSnapshot;
    pricing: PriceBreakdown;
    paymentId?: mongoose.Types.ObjectId;
    acceptedAt?: Date;
    printingStartedAt?: Date;
    readyAt?: Date;
    collectedAt?: Date;
    cancelledAt?: Date;
    failedAt?: Date;
    problemNote?: string;
    cancellationReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PrintJob: mongoose.Model<IPrintJob, {}, {}, {}, mongoose.Document<unknown, {}, IPrintJob, {}, mongoose.DefaultSchemaOptions> & IPrintJob & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPrintJob>;
//# sourceMappingURL=PrintJob.d.ts.map