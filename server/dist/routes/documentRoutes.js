"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const multer_1 = require("../config/multer");
const documentController_1 = require("../controllers/documentController");
const StorageService_1 = require("../services/StorageService");
// Ensure uploads dir exists on startup
StorageService_1.StorageService.ensureUploadsDir();
const router = (0, express_1.Router)();
router.post('/upload', authenticate_1.authenticate, authenticate_1.requireStudent, multer_1.upload.single('file'), documentController_1.uploadDocument);
router.get('/:id', authenticate_1.authenticate, documentController_1.getDocument);
router.get('/:id/download', authenticate_1.authenticate, documentController_1.downloadDocument);
router.delete('/:id', authenticate_1.authenticate, authenticate_1.requireStudent, documentController_1.deleteDocument);
exports.default = router;
//# sourceMappingURL=documentRoutes.js.map