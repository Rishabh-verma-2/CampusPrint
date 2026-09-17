import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types';

export interface IUser extends Document {
  name: string;
  email?: string;
  phone?: string;
  enrollmentNumber?: string;
  passwordHash?: string;
  role: UserRole;
  universityId?: mongoose.Types.ObjectId;
  campusId?: mongoose.Types.ObjectId;
  avatar?: string;
  isActive: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    enrollmentNumber: { type: String, trim: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ['STUDENT', 'VENDOR', 'ADMIN', 'SUPER_ADMIN'],
      default: 'STUDENT',
    },
    universityId: { type: Schema.Types.ObjectId, ref: 'University' },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ enrollmentNumber: 1 });
userSchema.index({ role: 1 });
userSchema.index({ universityId: 1 });
userSchema.index({ campusId: 1 });

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', userSchema);
