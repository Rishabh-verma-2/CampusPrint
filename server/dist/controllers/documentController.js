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
exports.downloadDocument = exports.deleteDocument = exports.getDocument = exports.uploadDocument = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const Document_1 = require("../models/Document");
const Settings_1 = require("../models/Settings");
const StorageService_1 = require("../services/StorageService");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Estimate PDF page count from file buffer (basic approach)
function estimatePdfPages(filePath) {
    try {
        const buffer = fs_1.default.readFileSync(filePath);
        const content = buffer.toString('latin1');
        const matches = content.match(/\/Type\s*\/Page[^s]/g);
        return matches ? matches.length : 1;
    }
    catch {
        return 1;
    }
}
exports.uploadDocument = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw (0, errorHandler_1.createError)('No file uploaded', 400, 'NO_FILE');
    }
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    // Estimate page count
    const pageCount = estimatePdfPages(filePath);
    // Check admin configured settings limits
    const settingsDocs = await Settings_1.Settings.find({
        key: { $in: ['MAX_UPLOAD_SIZE_MB', 'maxFileSizeMb', 'MAX_PAGES', 'maxPagesLimit'] },
    }).lean();
    const maxMb = Number(settingsDocs.find((s) => s.key === 'MAX_UPLOAD_SIZE_MB' || s.key === 'maxFileSizeMb')?.value) || 25;
    const maxPages = Number(settingsDocs.find((s) => s.key === 'MAX_PAGES' || s.key === 'maxPagesLimit')?.value) || 200;
    if (fileSize > maxMb * 1024 * 1024) {
        try {
            fs_1.default.unlinkSync(filePath);
        }
        catch (_) { }
        throw (0, errorHandler_1.createError)(`File exceeds the maximum allowed upload size of ${maxMb}MB`, 400, 'FILE_TOO_LARGE');
    }
    if (pageCount > maxPages) {
        try {
            fs_1.default.unlinkSync(filePath);
        }
        catch (_) { }
        throw (0, errorHandler_1.createError)(`Document has ${pageCount} pages, exceeding the maximum allowed limit of ${maxPages} pages`, 400, 'PAGE_LIMIT_EXCEEDED');
    }
    // Upload to storage (local dev / cloudinary prod)
    const uploadResult = await StorageService_1.StorageService.upload(filePath, originalName);
    // Save document record
    const document = await Document_1.DocumentModel.create({
        ownerId: req.user._id,
        fileName: uploadResult.fileName,
        originalName,
        fileType: mimeType,
        fileSize,
        pageCount,
        storageProvider: uploadResult.storageProvider,
        storageKey: uploadResult.storageKey,
        storageUrl: uploadResult.storageUrl,
    });
    res.status(201).json({
        success: true,
        data: {
            document: {
                _id: document._id,
                originalName: document.originalName,
                fileSize: document.fileSize,
                pageCount: document.pageCount,
                fileType: document.fileType,
                createdAt: document.createdAt,
            },
        },
    });
});
exports.getDocument = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const document = await Document_1.DocumentModel.findById(req.params.id);
    if (!document || document.isDeleted) {
        throw (0, errorHandler_1.createError)('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }
    // Only owner can access
    if (document.ownerId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Access denied', 403, 'FORBIDDEN');
    }
    const signedUrl = await StorageService_1.StorageService.getSignedUrl(document.storageKey, document.storageProvider);
    res.json({
        success: true,
        data: {
            document: {
                _id: document._id,
                originalName: document.originalName,
                fileSize: document.fileSize,
                pageCount: document.pageCount,
                fileType: document.fileType,
                url: signedUrl,
                createdAt: document.createdAt,
            },
        },
    });
});
exports.deleteDocument = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const document = await Document_1.DocumentModel.findById(req.params.id);
    if (!document || document.isDeleted) {
        throw (0, errorHandler_1.createError)('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }
    if (document.ownerId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Access denied', 403, 'FORBIDDEN');
    }
    await StorageService_1.StorageService.delete(document.storageKey, document.storageProvider);
    await Document_1.DocumentModel.findByIdAndUpdate(document._id, { isDeleted: true });
    res.json({ success: true, message: 'Document deleted' });
});
exports.downloadDocument = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const document = await Document_1.DocumentModel.findById(req.params.id);
    if (!document || document.isDeleted) {
        throw (0, errorHandler_1.createError)('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }
    // Only owner can download
    if (document.ownerId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Access denied', 403, 'FORBIDDEN');
    }
    if (document.storageProvider === 'local') {
        // Serve directly from disk
        const filePath = path_1.default.resolve(process.cwd(), document.storageKey);
        if (!fs_1.default.existsSync(filePath)) {
            throw (0, errorHandler_1.createError)('File not found on disk', 404, 'FILE_NOT_FOUND');
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
        return;
    }
    // Cloudinary: fetch the raw file and pipe it
    const signedUrl = await StorageService_1.StorageService.getSignedUrl(document.storageKey, document.storageProvider);
    const https = await Promise.resolve().then(() => __importStar(require('https')));
    const http = await Promise.resolve().then(() => __importStar(require('http')));
    const fileUrl = new URL(signedUrl);
    const client = fileUrl.protocol === 'https:' ? https : http;
    client.get(signedUrl, (fileRes) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName)}"`);
        fileRes.pipe(res);
    }).on('error', () => {
        res.status(500).json({ success: false, message: 'Failed to stream file' });
    });
});
//# sourceMappingURL=documentController.js.map