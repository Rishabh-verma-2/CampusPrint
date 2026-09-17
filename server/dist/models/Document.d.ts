import mongoose, { Document } from 'mongoose';
export interface IDocument extends Document {
    ownerId: mongoose.Types.ObjectId;
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    pageCount: number;
    storageProvider: 'local' | 'cloudinary';
    storageKey: string;
    storageUrl?: string;
    isDeleted: boolean;
    createdAt: Date;
}
export declare const DocumentModel: mongoose.Model<IDocument, {}, {}, {}, mongoose.Document<unknown, {}, IDocument, {}, mongoose.DefaultSchemaOptions> & IDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IDocument>;
//# sourceMappingURL=Document.d.ts.map