import mongoose, { Document, Schema } from 'mongoose';

export interface ICampus extends Document {
  universityId: mongoose.Types.ObjectId;
  name: string;
  address?: string;
  isActive: boolean;
}

const campusSchema = new Schema<ICampus>(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

campusSchema.index({ universityId: 1 });

export const Campus = mongoose.model<ICampus>('Campus', campusSchema);
