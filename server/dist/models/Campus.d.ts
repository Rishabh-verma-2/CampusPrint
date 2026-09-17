import mongoose, { Document } from 'mongoose';
export interface ICampus extends Document {
    universityId: mongoose.Types.ObjectId;
    name: string;
    address?: string;
    isActive: boolean;
}
export declare const Campus: mongoose.Model<ICampus, {}, {}, {}, mongoose.Document<unknown, {}, ICampus, {}, mongoose.DefaultSchemaOptions> & ICampus & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICampus>;
//# sourceMappingURL=Campus.d.ts.map