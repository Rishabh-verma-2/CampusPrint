import mongoose, { Document, Schema } from 'mongoose';

export interface IUniversity extends Document {
  name: string;
  code: string;
  logo?: string;
  location?: string;
  isActive: boolean;
}

const universitySchema = new Schema<IUniversity>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    logo: { type: String },
    location: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const University = mongoose.model<IUniversity>('University', universitySchema);
