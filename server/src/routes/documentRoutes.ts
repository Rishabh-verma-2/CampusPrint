import { Router } from 'express';
import { authenticate, requireStudent } from '../middleware/authenticate';
import { upload } from '../config/multer';
import { uploadDocument, getDocument, deleteDocument, downloadDocument } from '../controllers/documentController';
import { StorageService } from '../services/StorageService';

// Ensure uploads dir exists on startup
StorageService.ensureUploadsDir();

const router = Router();

router.post('/upload', authenticate, requireStudent, upload.single('file'), uploadDocument);
router.get('/:id', authenticate, getDocument);
router.get('/:id/download', authenticate, downloadDocument);
router.delete('/:id', authenticate, requireStudent, deleteDocument);

export default router;
