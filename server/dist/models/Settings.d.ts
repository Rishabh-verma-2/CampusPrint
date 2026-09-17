import mongoose, { Document } from 'mongoose';
export interface ISettings extends Document {
    key: string;
    value: unknown;
    description?: string;
}
export declare const Settings: mongoose.Model<ISettings, {}, {}, {}, mongoose.Document<unknown, {}, ISettings, {}, mongoose.DefaultSchemaOptions> & ISettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISettings>;
export declare const DEFAULT_SETTINGS: {
    PLATFORM_FEE: number;
    MAX_UPLOAD_SIZE_MB: number;
    SUPPORTED_FILE_TYPES: string[];
    MAX_PAGES: number;
    DOCUMENT_RETENTION_DAYS: number;
    MAX_COPIES: number;
};
//# sourceMappingURL=Settings.d.ts.map