export interface UploadResult {
    storageProvider: 'local' | 'cloudinary';
    storageKey: string;
    storageUrl: string;
    fileName: string;
}
/**
 * Abstracted storage service.
 * Uses local disk in development; swap to Cloudinary in production.
 */
export declare class StorageService {
    private static uploadsDir;
    static ensureUploadsDir(): void;
    /**
     * In dev: file is already on disk via Multer, return local URL.
     * In prod: upload to Cloudinary and return public/signed URL.
     */
    static upload(localPath: string, originalName: string): Promise<UploadResult>;
    private static storeLocally;
    private static uploadToCloudinary;
    static getSignedUrl(storageKey: string, provider: 'local' | 'cloudinary'): Promise<string>;
    static delete(storageKey: string, provider: 'local' | 'cloudinary'): Promise<void>;
}
//# sourceMappingURL=StorageService.d.ts.map