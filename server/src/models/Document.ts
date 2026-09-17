import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  ownerId: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number; // bytes
  pageCount: number;
  storageProvider: 'local' | 'cloudinary';
  storageKey: string; // file path or cloudinary public_id
  storageUrl?: string; // direct URL (local dev only)
  isDeleted: boolean;
  createdAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    pageCount: { type: Number, required: true, default: 0 },
    storageProvider: { type: String, enum: ['local', 'cloudinary'], default: 'local' },
    storageKey: { type: String, required: true },
    storageUrl: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

documentSchema.index({ ownerId: 1 });

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);
