import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  value: unknown;
  description?: string;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

// Default settings
export const DEFAULT_SETTINGS = {
  PLATFORM_FEE: 2,
  MAX_UPLOAD_SIZE_MB: 20,
  SUPPORTED_FILE_TYPES: ['application/pdf'],
  MAX_PAGES: 200,
  DOCUMENT_RETENTION_DAYS: 7,
  MAX_COPIES: 10,
};
