import mongoose, { Document } from 'mongoose';
export interface IUniversity extends Document {
    name: string;
    code: string;
    logo?: string;
    location?: string;
    isActive: boolean;
}
export declare const University: mongoose.Model<IUniversity, {}, {}, {}, mongoose.Document<unknown, {}, IUniversity, {}, mongoose.DefaultSchemaOptions> & IUniversity & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUniversity>;
//# sourceMappingURL=University.d.ts.map