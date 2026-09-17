import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { DocumentModel } from '../models/Document';
import { Settings } from '../models/Settings';
import { StorageService } from '../services/StorageService';
import path from 'path';
import fs from 'fs';

// Estimate PDF page count from file buffer (basic approach)
function estimatePdfPages(filePath: string): number {
  try {
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('latin1');
    const matches = content.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 1;
  } catch {
    return 1;
  }
}

export const uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw createError('No file uploaded', 400, 'NO_FILE');
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const fileSize = req.file.size;
  const mimeType = req.file.mimetype;

  // Estimate page count
  const pageCount = estimatePdfPages(filePath);

  // Check admin configured settings limits
  const settingsDocs = await Settings.find({
    key: { $in: ['MAX_UPLOAD_SIZE_MB', 'maxFileSizeMb', 'MAX_PAGES', 'maxPagesLimit'] },
  }).lean();
  const maxMb =
    Number(
      settingsDocs.find((s) => s.key === 'MAX_UPLOAD_SIZE_MB' || s.key === 'maxFileSizeMb')?.value
    ) || 25;
  const maxPages =
    Number(
      settingsDocs.find((s) => s.key === 'MAX_PAGES' || s.key === 'maxPagesLimit')?.value
    ) || 200;

  if (fileSize > maxMb * 1024 * 1024) {
    try { fs.unlinkSync(filePath); } catch (_) {}
    throw createError(
      `File exceeds the maximum allowed upload size of ${maxMb}MB`,
      400,
      'FILE_TOO_LARGE'
    );
  }

  if (pageCount > maxPages) {
    try { fs.unlinkSync(filePath); } catch (_) {}
    throw createError(
      `Document has ${pageCount} pages, exceeding the maximum allowed limit of ${maxPages} pages`,
      400,
      'PAGE_LIMIT_EXCEEDED'
    );
  }

  // Upload to storage (local dev / cloudinary prod)
  const uploadResult = await StorageService.upload(filePath, originalName);

  // Save document record
  const document = await DocumentModel.create({
    ownerId: req.user!._id,
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

export const getDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const document = await DocumentModel.findById(req.params.id);

  if (!document || document.isDeleted) {
    throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Only owner can access
  if (document.ownerId.toString() !== req.user!._id) {
    throw createError('Access denied', 403, 'FORBIDDEN');
  }

  const signedUrl = await StorageService.getSignedUrl(document.storageKey, document.storageProvider);

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

export const deleteDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const document = await DocumentModel.findById(req.params.id);

  if (!document || document.isDeleted) {
    throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (document.ownerId.toString() !== req.user!._id) {
    throw createError('Access denied', 403, 'FORBIDDEN');
  }

  await StorageService.delete(document.storageKey, document.storageProvider);
  await DocumentModel.findByIdAndUpdate(document._id, { isDeleted: true });

  res.json({ success: true, message: 'Document deleted' });
});
