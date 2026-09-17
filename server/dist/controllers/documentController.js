"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.getDocument = exports.uploadDocument = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const Document_1 = require("../models/Document");
const StorageService_1 = require("../services/StorageService");
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
//# sourceMappingURL=documentController.js.map