"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const env_1 = require("../config/env");
/**
 * Abstracted storage service.
 * Uses local disk in development; swap to Cloudinary in production.
 */
class StorageService {
    static ensureUploadsDir() {
        if (!fs_1.default.existsSync(this.uploadsDir)) {
            fs_1.default.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }
    /**
     * In dev: file is already on disk via Multer, return local URL.
     * In prod: upload to Cloudinary and return public/signed URL.
     */
    static async upload(localPath, originalName) {
        this.ensureUploadsDir();
        const hasCloudinary = env_1.env.CLOUDINARY_CLOUD_NAME && env_1.env.CLOUDINARY_API_KEY && env_1.env.CLOUDINARY_API_SECRET;
        if (hasCloudinary) {
            return this.uploadToCloudinary(localPath, originalName);
        }
        return this.storeLocally(localPath, originalName);
    }
    /**
     * Upload an in-memory buffer directly to storage (local disk or Cloudinary).
     */
    static async uploadBuffer(buffer, originalName) {
        this.ensureUploadsDir();
        const ext = path_1.default.extname(originalName) || '.pdf';
        const uniqueFileName = `doc_${Date.now()}_${(0, uuid_1.v4)().slice(0, 8)}${ext}`;
        const localPath = path_1.default.join(this.uploadsDir, uniqueFileName);
        fs_1.default.writeFileSync(localPath, buffer);
        const hasCloudinary = env_1.env.CLOUDINARY_CLOUD_NAME && env_1.env.CLOUDINARY_API_KEY && env_1.env.CLOUDINARY_API_SECRET;
        if (hasCloudinary) {
            return this.uploadToCloudinary(localPath, originalName);
        }
        return this.storeLocally(localPath, originalName);
    }
    /**
     * Retrieve the raw file bytes for a document from local disk or Cloudinary.
     */
    static async getFileBuffer(storageKey, provider) {
        if (provider === 'local') {
            const filePath = path_1.default.resolve(process.cwd(), storageKey);
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error(`File not found at ${filePath}`);
            }
            return fs_1.default.readFileSync(filePath);
        }
        // Cloudinary download
        const signedUrl = await this.getSignedUrl(storageKey, provider);
        const https = await Promise.resolve().then(() => __importStar(require('https')));
        const http = await Promise.resolve().then(() => __importStar(require('http')));
        const client = signedUrl.startsWith('https') ? https : http;
        return new Promise((resolve, reject) => {
            client
                .get(signedUrl, (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    return reject(new Error(`Failed to fetch file from Cloudinary (HTTP ${res.statusCode})`));
                }
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', reject);
            })
                .on('error', reject);
        });
    }
    static storeLocally(localPath, originalName) {
        const fileName = path_1.default.basename(localPath);
        const storageKey = `uploads/${fileName}`;
        const storageUrl = `/uploads/${fileName}`;
        return {
            storageProvider: 'local',
            storageKey,
            storageUrl,
            fileName,
        };
    }
    static async uploadToCloudinary(localPath, originalName) {
        // Lazy import to avoid hard dep in dev
        const cloudinary = await Promise.resolve().then(() => __importStar(require('cloudinary')));
        cloudinary.v2.config({
            cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
            api_key: env_1.env.CLOUDINARY_API_KEY,
            api_secret: env_1.env.CLOUDINARY_API_SECRET,
        });
        const result = await cloudinary.v2.uploader.upload(localPath, {
            folder: 'campusprint/documents',
            resource_type: 'raw',
            use_filename: true,
            unique_filename: true,
        });
        // Delete local temp file
        fs_1.default.unlink(localPath, () => { });
        return {
            storageProvider: 'cloudinary',
            storageKey: result.public_id,
            storageUrl: result.secure_url,
            fileName: path_1.default.basename(result.public_id),
        };
    }
    static async getSignedUrl(storageKey, provider) {
        if (provider === 'local') {
            const fileName = path_1.default.basename(storageKey);
            return `/uploads/${fileName}`;
        }
        // Cloudinary signed URL
        const cloudinary = await Promise.resolve().then(() => __importStar(require('cloudinary')));
        cloudinary.v2.config({
            cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
            api_key: env_1.env.CLOUDINARY_API_KEY,
            api_secret: env_1.env.CLOUDINARY_API_SECRET,
        });
        // Cloudinary private download URL for raw assets bypasses ACL delivery restrictions
        return cloudinary.v2.utils.private_download_url(storageKey, '', {
            resource_type: 'raw',
            type: 'upload',
            expires_at: Math.floor(Date.now() / 1000) + 7200,
        });
    }
    static async delete(storageKey, provider) {
        try {
            if (provider === 'local') {
                const filePath = path_1.default.resolve(process.cwd(), storageKey);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
                return;
            }
            if (provider === 'cloudinary') {
                const cloudinary = await Promise.resolve().then(() => __importStar(require('cloudinary')));
                cloudinary.v2.config({
                    cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
                    api_key: env_1.env.CLOUDINARY_API_KEY,
                    api_secret: env_1.env.CLOUDINARY_API_SECRET,
                });
                await cloudinary.v2.uploader.destroy(storageKey, { resource_type: 'raw' });
            }
        }
        catch (err) {
            console.warn(`[StorageService] Delete failed for ${storageKey} (${provider}):`, err?.message);
        }
    }
}
exports.StorageService = StorageService;
StorageService.uploadsDir = path_1.default.resolve(process.cwd(), env_1.env.UPLOADS_DIR || 'uploads');
//# sourceMappingURL=StorageService.js.map