import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  studentId: string;
  department?: string;
  year?: number;
}

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    studentId: { type: String, required: true },
    department: { type: String },
    year: { type: Number, min: 1, max: 6 },
  },
  { timestamps: true }
);

studentProfileSchema.index({ studentId: 1 });

export const StudentProfile = mongoose.model<IStudentProfile>('StudentProfile', studentProfileSchema);
