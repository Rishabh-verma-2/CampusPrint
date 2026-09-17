import mongoose, { Document } from 'mongoose';
export interface IStudentProfile extends Document {
    userId: mongoose.Types.ObjectId;
    studentId: string;
    department?: string;
    year?: number;
}
export declare const StudentProfile: mongoose.Model<IStudentProfile, {}, {}, {}, mongoose.Document<unknown, {}, IStudentProfile, {}, mongoose.DefaultSchemaOptions> & IStudentProfile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IStudentProfile>;
//# sourceMappingURL=StudentProfile.d.ts.map