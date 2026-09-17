import mongoose, { Document } from 'mongoose';
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
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=User.d.ts.map