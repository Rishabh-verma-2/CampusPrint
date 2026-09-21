import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

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
export class StorageService {
  private static uploadsDir = path.resolve(process.cwd(), env.UPLOADS_DIR || 'uploads');

  static ensureUploadsDir(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * In dev: file is already on disk via Multer, return local URL.
   * In prod: upload to Cloudinary and return public/signed URL.
   */
  static async upload(localPath: string, originalName: string): Promise<UploadResult> {
    this.ensureUploadsDir();

    const hasCloudinary =
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      return this.uploadToCloudinary(localPath, originalName);
    }

    return this.storeLocally(localPath, originalName);
  }

  private static storeLocally(localPath: string, originalName: string): UploadResult {
    const fileName = path.basename(localPath);
    const storageKey = `uploads/${fileName}`;
    const storageUrl = `/uploads/${fileName}`;
    return {
      storageProvider: 'local',
      storageKey,
      storageUrl,
      fileName,
    };
  }

  private static async uploadToCloudinary(
    localPath: string,
    originalName: string
  ): Promise<UploadResult> {
    // Lazy import to avoid hard dep in dev
    const cloudinary = await import('cloudinary');
    cloudinary.v2.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.v2.uploader.upload(localPath, {
      folder: 'campusprint/documents',
      resource_type: 'raw',
      use_filename: true,
      unique_filename: true,
    });

    // Delete local temp file
    fs.unlink(localPath, () => {});

    return {
      storageProvider: 'cloudinary',
      storageKey: result.public_id,
      storageUrl: result.secure_url,
      fileName: path.basename(result.public_id),
    };
  }

  static async getSignedUrl(storageKey: string, provider: 'local' | 'cloudinary'): Promise<string> {
    if (provider === 'local') {
      const fileName = path.basename(storageKey);
      return `/uploads/${fileName}`;
    }

    // Cloudinary signed URL
    const cloudinary = await import('cloudinary');
    cloudinary.v2.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });

    // Cloudinary private download URL for raw assets bypasses ACL delivery restrictions
    return cloudinary.v2.utils.private_download_url(storageKey, '', {
      resource_type: 'raw',
      type: 'upload',
      expires_at: Math.floor(Date.now() / 1000) + 7200,
    });
  }

  static async delete(storageKey: string, provider: 'local' | 'cloudinary'): Promise<void> {
    try {
      if (provider === 'local') {
        const filePath = path.resolve(process.cwd(), storageKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return;
      }

      if (provider === 'cloudinary') {
        const cloudinary = await import('cloudinary');
        cloudinary.v2.config({
          cloud_name: env.CLOUDINARY_CLOUD_NAME,
          api_key: env.CLOUDINARY_API_KEY,
          api_secret: env.CLOUDINARY_API_SECRET,
        });
        await cloudinary.v2.uploader.destroy(storageKey, { resource_type: 'raw' });
      }
    } catch (err: any) {
      console.warn(`[StorageService] Delete failed for ${storageKey} (${provider}):`, err?.message);
    }
  }
}
