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
exports.getJobPaymentStatus = exports.getQueuePosition = exports.reportProblem = exports.verifyPickupToken = exports.collectPrintJob = exports.cancelPrintJob = exports.markReady = exports.startPrinting = exports.acceptPrintJob = exports.downloadPrintJobFile = exports.getPrintJob = exports.getMyPrintJobs = exports.createPrintJob = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errorHandler_1 = require("../middleware/errorHandler");
const Vendor_1 = require("../models/Vendor");
const Document_1 = require("../models/Document");
const PrintJob_1 = require("../models/PrintJob");
const Payment_1 = require("../models/Payment");
const User_1 = require("../models/User");
const StudentProfile_1 = require("../models/StudentProfile");
const Settings_1 = require("../models/Settings");
const StorageService_1 = require("../services/StorageService");
const PricingService_1 = require("../services/PricingService");
const PdfService_1 = require("../services/PdfService");
const PrintJobStateMachine_1 = require("../services/PrintJobStateMachine");
const TokenService_1 = require("../services/TokenService");
const NotificationService_1 = require("../services/NotificationService");
const socketManager_1 = require("../sockets/socketManager");
// ─── Create Print Job (QUEUED) ────────────────────────────────────────────────
exports.createPrintJob = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { documentId, documentIds, vendorId, printConfig } = req.body;
    // Resolve document IDs (supporting both multiple documents or single document)
    const docIds = Array.isArray(documentIds) && documentIds.length > 0
        ? documentIds
        : (documentId ? [documentId] : []);
    if (docIds.length === 0) {
        throw (0, errorHandler_1.createError)('At least one document is required', 400, 'DOCUMENT_REQUIRED');
    }
    // Verify document ownership & existence
    const documents = await Document_1.DocumentModel.find({ _id: { $in: docIds } });
    if (documents.length !== docIds.length || documents.some((d) => d.isDeleted)) {
        throw (0, errorHandler_1.createError)('One or more documents not found or deleted', 404, 'DOCUMENT_NOT_FOUND');
    }
    for (const doc of documents) {
        if (doc.ownerId.toString() !== req.user._id) {
            throw (0, errorHandler_1.createError)('Access denied for document', 403, 'FORBIDDEN');
        }
    }
    // Verify vendor exists, is active, and is open
    const vendor = await Vendor_1.Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'ACTIVE' || vendor.availability !== 'OPEN') {
        throw (0, errorHandler_1.createError)('Vendor not available', 400, 'VENDOR_UNAVAILABLE');
    }
    // Calculate total pages across all selected documents
    const combinedRawPages = documents.reduce((sum, d) => sum + (d.pageCount || 1), 0);
    const isCustomRange = documents.length === 1 &&
        Boolean(printConfig?.pageRanges) &&
        printConfig.pageRanges.trim().toLowerCase() !== 'all';
    let totalPages;
    let pageNumbers = [];
    try {
        if (isCustomRange) {
            pageNumbers = (0, PricingService_1.extractPageNumbers)(printConfig.pageRanges, documents[0].pageCount || 1);
            totalPages = pageNumbers.length;
        }
        else {
            totalPages = combinedRawPages;
        }
    }
    catch (e) {
        throw (0, errorHandler_1.createError)(e.message, 400, 'INVALID_PAGE_RANGE');
    }
    // ─── If Custom Page Range: Generate and Store the Updated Sliced PDF ───────
    let targetDocument = documents[0];
    let isCustomPdf = false;
    const originalDoc = documents[0];
    if (isCustomRange && pageNumbers.length > 0) {
        try {
            const srcBuffer = await StorageService_1.StorageService.getFileBuffer(originalDoc.storageKey, originalDoc.storageProvider);
            const extractedBuffer = await PdfService_1.PdfService.extractPages(srcBuffer, pageNumbers);
            const ext = path_1.default.extname(originalDoc.originalName) || '.pdf';
            const base = path_1.default.basename(originalDoc.originalName, ext);
            const customOriginalName = `${base} (Pages ${printConfig.pageRanges.trim()})${ext}`;
            const uploadResult = await StorageService_1.StorageService.uploadBuffer(extractedBuffer, customOriginalName);
            const customDoc = await Document_1.DocumentModel.create({
                ownerId: req.user._id,
                fileName: uploadResult.fileName,
                originalName: customOriginalName,
                fileType: 'application/pdf',
                fileSize: extractedBuffer.length,
                pageCount: pageNumbers.length,
                storageProvider: uploadResult.storageProvider,
                storageKey: uploadResult.storageKey,
                storageUrl: uploadResult.storageUrl,
            });
            targetDocument = customDoc;
            isCustomPdf = true;
            console.log(`[createPrintJob] Created updated custom PDF document ${customDoc._id} (${pageNumbers.length} pages: ${printConfig.pageRanges}) for student ${req.user._id}`);
        }
        catch (pdfErr) {
            console.error('[createPrintJob] Failed to generate custom PDF:', pdfErr);
            throw (0, errorHandler_1.createError)(`Failed to process custom PDF: ${pdfErr.message || 'Page extraction failed'}`, 500, 'PDF_PROCESSING_FAILED');
        }
    }
    const configWithPages = {
        ...printConfig,
        totalPages,
        pageRanges: printConfig?.pageRanges || 'all',
    };
    const priceSnapshot = {
        bwPerPage: vendor.pricing.bwPerPage,
        colorPerPage: vendor.pricing.colorPerPage,
        duplexDiscount: vendor.pricing.duplexDiscount,
    };
    const feeDoc = await Settings_1.Settings.findOne({ key: { $in: ['platformFee', 'PLATFORM_FEE'] } }).lean();
    const platformFee = feeDoc?.value !== undefined ? Number(feeDoc.value) : 2;
    const pricing = PricingService_1.PricingService.calculate(configWithPages, priceSnapshot, combinedRawPages, platformFee);
    const publicToken = await TokenService_1.TokenService.generateUniqueToken(vendor._id.toString());
    const student = await User_1.User.findById(req.user._id);
    const studentProfile = await StudentProfile_1.StudentProfile.findOne({ userId: req.user._id });
    const customerName = student?.name || 'Student';
    const customerIdentifier = studentProfile?.studentId || student?.enrollmentNumber || student?.phone || 'Guest';
    const customerPhone = student?.phone || '';
    const customerEnrollment = studentProfile?.studentId || student?.enrollmentNumber || '';
    const printJob = await PrintJob_1.PrintJob.create({
        publicToken,
        studentId: req.user._id,
        customerName,
        customerIdentifier,
        customerPhone,
        customerEnrollment,
        vendorId: vendor._id,
        universityId: vendor.universityId,
        campusId: vendor.campusId,
        documentId: targetDocument._id,
        documentIds: isCustomPdf ? [targetDocument._id] : documents.map((d) => d._id),
        originalDocumentId: isCustomPdf ? originalDoc._id : undefined,
        isCustomPdf,
        status: 'PAYMENT_PENDING', // Job starts awaiting payment
        printConfig: configWithPages,
        priceSnapshot,
        pricing,
    });
    // NOTE: We do NOT emit to vendor or notify vendor here.
    // Vendor is only notified after payment is confirmed (handled in paymentController → transitionJobToPaid).
    // We do emit to the student so their UI can update.
    try {
        const io = (await Promise.resolve().then(() => __importStar(require('../sockets/socketManager')))).getIO();
        io.to(`student:${req.user._id}`).emit('printJob:created', { job: printJob });
    }
    catch { /* Socket not initialized */ }
    res.status(201).json({
        success: true,
        data: {
            printJob: {
                _id: printJob._id,
                publicToken: printJob.publicToken,
                status: printJob.status,
                pricing: printJob.pricing,
                printConfig: printJob.printConfig,
                isCustomPdf: printJob.isCustomPdf,
                vendorId: {
                    _id: vendor._id,
                    shopName: vendor.shopName,
                    address: vendor.address,
                },
                documentId: targetDocument,
                documentIds: isCustomPdf ? [targetDocument] : documents,
                originalDocumentId: isCustomPdf ? originalDoc : undefined,
                createdAt: printJob.createdAt,
            },
        },
    });
});
// ─── Get Print Jobs (student) ─────────────────────────────────────────────────
exports.getMyPrintJobs = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { studentId: req.user._id };
    if (status)
        filter.status = status;
    const jobs = await PrintJob_1.PrintJob.find(filter)
        .populate('documentId', 'originalName fileSize pageCount')
        .populate('documentIds', 'originalName fileSize pageCount')
        .populate('vendorId', 'shopName address')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean();
    const total = await PrintJob_1.PrintJob.countDocuments(filter);
    res.json({ success: true, data: { jobs, total, page: Number(page), limit: Number(limit) } });
});
// ─── Get Single Print Job ─────────────────────────────────────────────────────
exports.getPrintJob = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const job = await PrintJob_1.PrintJob.findById(req.params.id)
        .populate('documentId', 'originalName fileSize pageCount fileType')
        .populate('documentIds', 'originalName fileSize pageCount fileType')
        .populate('originalDocumentId', 'originalName fileSize pageCount fileType')
        .populate('vendorId', 'shopName address phone')
        .populate('studentId', 'name email phone')
        .lean();
    if (!job)
        throw (0, errorHandler_1.createError)('Print job not found', 404, 'JOB_NOT_FOUND');
    // Authorization: student sees own jobs, vendor sees jobs assigned to them, admin sees all
    const role = req.user.role;
    const userId = req.user._id;
    if (role === 'STUDENT' && job.studentId._id?.toString() !== userId) {
        throw (0, errorHandler_1.createError)('Access denied', 403, 'FORBIDDEN');
    }
    if (role === 'VENDOR') {
        const vendor = await Vendor_1.Vendor.findOne({ userId });
        if (!vendor || job.vendorId._id?.toString() !== vendor._id.toString()) {
            throw (0, errorHandler_1.createError)('Access denied', 403, 'FORBIDDEN');
        }
    }
    // Get signed URL for vendor (never provided for COLLECTED jobs)
    let documentUrl;
    if ((role === 'VENDOR' || role === 'ADMIN' || role === 'SUPER_ADMIN') && job.status !== 'COLLECTED') {
        const docId = job.documentId?._id || job.documentId;
        if (docId) {
            const doc = await Document_1.DocumentModel.findById(docId);
            if (doc) {
                documentUrl = await StorageService_1.StorageService.getSignedUrl(doc.storageKey, doc.storageProvider);
            }
        }
    }
    res.json({ success: true, data: { job, documentUrl } });
});
exports.downloadPrintJobFile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const job = await PrintJob_1.PrintJob.findById(req.params.id);
    if (!job)
        throw (0, errorHandler_1.createError)('Print job not found', 404, 'JOB_NOT_FOUND');
    // Once a job is completed / COLLECTED, documents are permanently deleted for privacy
    if (job.status === 'COLLECTED') {
        throw (0, errorHandler_1.createError)('Document has been permanently deleted after pickup completion', 410, 'DOCUMENT_DELETED');
    }
    const role = req.user.role;
    const userId = req.user._id;
    if (role === 'STUDENT' && job.studentId.toString() !== userId) {
        throw (0, errorHandler_1.createError)('Access denied', 403, 'FORBIDDEN');
    }
    if (role === 'VENDOR') {
        const vendor = await Vendor_1.Vendor.findOne({ userId });
        if (!vendor || job.vendorId.toString() !== vendor._id.toString()) {
            throw (0, errorHandler_1.createError)('Access denied', 403, 'FORBIDDEN');
        }
    }
    const docId = job.documentId?._id || job.documentId;
    const doc = await Document_1.DocumentModel.findById(docId);
    if (!doc)
        throw (0, errorHandler_1.createError)('Document not found or already deleted', 404, 'DOCUMENT_NOT_FOUND');
    if (doc.storageProvider === 'local') {
        const filePath = path_1.default.resolve(process.cwd(), doc.storageKey);
        if (!fs_1.default.existsSync(filePath)) {
            throw (0, errorHandler_1.createError)('File not found on disk', 404, 'FILE_NOT_FOUND');
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName)}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
        return;
    }
    const fileUrl = await StorageService_1.StorageService.getSignedUrl(doc.storageKey, doc.storageProvider);
    res.redirect(fileUrl);
});
// ─── Vendor: Accept Job ───────────────────────────────────────────────────────
exports.acceptPrintJob = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const job = await PrintJob_1.PrintJob.findById(req.params.id);
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    if (job.vendorId.toString() !== vendor._id.toString()) {
        throw (0, errorHandler_1.createError)('Access denied', 403, 'FORBIDDEN');
    }
    // PAYMENT GUARD: Vendor cannot accept unpaid jobs
    if (job.status === 'PAYMENT_PENDING') {
        throw (0, errorHandler_1.createError)('Cannot accept job: payment has not been completed', 400, 'PAYMENT_REQUIRED');
    }
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'ACCEPTED');
    job.status = 'ACCEPTED';
    job.acceptedAt = new Date();
    await job.save();
    const vId = getCleanId(job.vendorId);
    const sId = getCleanId(job.studentId);
    emitJobUpdate(vId, sId, job);
    emitQueueUpdated(vId);
    await NotificationService_1.NotificationService.create(sId, 'JOB_ACCEPTED', 'Print Job Accepted', `Your print job ${job.publicToken} has been accepted by the vendor.`, { jobId: job._id });
    res.json({ success: true, data: { job } });
});
// ─── Vendor: Start Printing ───────────────────────────────────────────────────
exports.startPrinting = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const job = await PrintJob_1.PrintJob.findById(req.params.id);
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    if (job.vendorId.toString() !== vendor._id.toString())
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    // PAYMENT GUARD: Cannot start printing without payment
    if (job.status === 'PAYMENT_PENDING') {
        throw (0, errorHandler_1.createError)('Cannot start printing: payment has not been completed', 400, 'PAYMENT_REQUIRED');
    }
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'PRINTING');
    job.status = 'PRINTING';
    job.acceptedAt = job.acceptedAt || new Date();
    job.printingStartedAt = new Date();
    await job.save();
    const vId = getCleanId(job.vendorId);
    const sId = getCleanId(job.studentId);
    emitJobUpdate(vId, sId, job);
    emitQueueUpdated(vId);
    // Generate signed document URL for immediate opening/printing
    let documentUrl;
    const docId = job.documentId?._id || job.documentId;
    if (docId) {
        const doc = await Document_1.DocumentModel.findById(docId);
        if (doc) {
            documentUrl = await StorageService_1.StorageService.getSignedUrl(doc.storageKey, doc.storageProvider);
        }
    }
    await NotificationService_1.NotificationService.create(sId, 'JOB_PRINTING', 'Printing Started', `Your print job ${job.publicToken} is now printing!`, { jobId: job._id });
    res.json({ success: true, data: { job, documentUrl } });
});
// ─── Vendor: Mark Ready ───────────────────────────────────────────────────────
exports.markReady = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const job = await PrintJob_1.PrintJob.findById(req.params.id);
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    if (job.vendorId.toString() !== vendor._id.toString())
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'READY');
    job.status = 'READY';
    job.readyAt = new Date();
    await job.save();
    const vId = getCleanId(job.vendorId);
    const sId = getCleanId(job.studentId);
    emitJobUpdate(vId, sId, job);
    emitQueueUpdated(vId);
    await NotificationService_1.NotificationService.create(sId, 'JOB_READY', 'Your print is ready', `Your print job ${job.publicToken} is ready for pickup at the vendor.`, { jobId: job._id });
    res.json({ success: true, data: { job } });
});
// ─── Vendor: Cancel Job ───────────────────────────────────────────────────────
exports.cancelPrintJob = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const job = await PrintJob_1.PrintJob.findById(req.params.id);
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    // Student or vendor can cancel (within allowed states)
    const role = req.user.role;
    if (role === 'STUDENT' && job.studentId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    }
    if (role === 'VENDOR') {
        const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
        if (!vendor || job.vendorId.toString() !== vendor._id.toString()) {
            throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
        }
    }
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'CANCELLED');
    job.status = 'CANCELLED';
    job.cancelledAt = new Date();
    job.cancellationReason = req.body.reason || 'Cancelled';
    await job.save();
    emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
    res.json({ success: true, data: { job } });
});
// ─── Vendor: Collect (Pickup Verification) ────────────────────────────────────
exports.collectPrintJob = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const job = await PrintJob_1.PrintJob.findById(req.params.id)
        .populate('studentId', 'name phone enrollmentNumber');
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    if (job.vendorId.toString() !== vendor._id.toString())
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    // Idempotent: If already COLLECTED (double-click or network retry), return success
    if (job.status === 'COLLECTED') {
        return res.json({ success: true, data: { job } });
    }
    if (job.status !== 'READY') {
        throw (0, errorHandler_1.createError)(`Job ${job.publicToken} is currently in '${job.status}' status. Only orders marked 'READY' can be collected.`, 400, 'NOT_READY');
    }
    // Verify token — accept various input formats: '3', '03', 'CP-03', 'cp-3'
    if (token) {
        const cleanToken = token.trim().toUpperCase();
        const tokenCandidates = TokenService_1.TokenService.normalizeInputToken(cleanToken);
        const tokenMatches = tokenCandidates.includes(job.publicToken.toUpperCase()) ||
            cleanToken === job.publicToken.toUpperCase() ||
            cleanToken === job.publicToken.replace('CP-', '').toUpperCase();
        if (!tokenMatches) {
            throw (0, errorHandler_1.createError)(`Invalid token. Expected ${job.publicToken}, got "${token}"`, 400, 'INVALID_TOKEN');
        }
    }
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'COLLECTED');
    job.status = 'COLLECTED';
    job.collectedAt = new Date();
    await job.save();
    // ─── Clean up document from Database & Cloudinary ─────────────────────────
    // Permanently delete PDF files from Cloudinary and remove Document records from DB
    const docIdsToClean = [];
    if (job.documentId) {
        const dId = job.documentId?._id || job.documentId;
        docIdsToClean.push(dId.toString());
    }
    if (job.originalDocumentId) {
        const oId = job.originalDocumentId?._id || job.originalDocumentId;
        if (oId && !docIdsToClean.includes(oId.toString())) {
            docIdsToClean.push(oId.toString());
        }
    }
    if (Array.isArray(job.documentIds) && job.documentIds.length > 0) {
        for (const d of job.documentIds) {
            const dId = d?._id || d;
            if (dId && !docIdsToClean.includes(dId.toString())) {
                docIdsToClean.push(dId.toString());
            }
        }
    }
    for (const docId of docIdsToClean) {
        try {
            const doc = await Document_1.DocumentModel.findById(docId);
            if (doc) {
                // Check if any other non-collected job is still using this document
                const otherActiveJob = await PrintJob_1.PrintJob.findOne({
                    _id: { $ne: job._id },
                    status: { $nin: ['COLLECTED', 'CANCELLED', 'FAILED'] },
                    $or: [
                        { documentId: doc._id },
                        { documentIds: doc._id },
                        { originalDocumentId: doc._id },
                    ],
                });
                if (!otherActiveJob) {
                    console.log(`[Collect] Permanently deleting PDF from ${doc.storageProvider}: ${doc.storageKey}`);
                    await StorageService_1.StorageService.delete(doc.storageKey, doc.storageProvider);
                    await Document_1.DocumentModel.findByIdAndDelete(doc._id);
                    console.log(`[Collect] Document record ${doc._id} permanently deleted from DB`);
                }
                else {
                    console.log(`[Collect] Document ${doc._id} is still in use by job ${otherActiveJob.publicToken}`);
                }
            }
        }
        catch (err) {
            console.warn(`[Collect] Non-fatal error deleting document ${docId}:`, err?.message);
        }
    }
    const vId = getCleanId(job.vendorId);
    const sId = getCleanId(job.studentId);
    emitJobUpdate(vId, sId, job);
    emitQueueUpdated(vId); // queue positions shift
    await NotificationService_1.NotificationService.create(sId, 'JOB_COLLECTED', 'Pickup Confirmed', `Your print job ${job.publicToken} has been collected. Thank you for using CampusPrint!`, { jobId: job._id });
    res.json({ success: true, data: { job } });
});
// ─── Vendor: Verify Token (pre-collect) ──────────────────────────────────────
exports.verifyPickupToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const rawToken = token?.trim().toUpperCase();
    const tokenCandidates = TokenService_1.TokenService.normalizeInputToken(rawToken || '');
    // Scope search to THIS vendor's jobs and match against normalized candidates
    const job = await PrintJob_1.PrintJob.findOne({
        vendorId: vendor._id,
        publicToken: { $in: [...tokenCandidates, rawToken] },
    })
        .populate('studentId', 'name email phone enrollmentNumber')
        .populate('documentId', 'originalName pageCount')
        .populate('documentIds', 'originalName pageCount');
    if (!job) {
        throw (0, errorHandler_1.createError)(`Token "${token}" not found for your store`, 404, 'INVALID_TOKEN');
    }
    if (job.status === 'COLLECTED') {
        throw (0, errorHandler_1.createError)(`Order ${job.publicToken} has already been collected and completed`, 400, 'ALREADY_COLLECTED');
    }
    if (job.status !== 'READY') {
        throw (0, errorHandler_1.createError)(`Order ${job.publicToken} is currently '${job.status}'. Please print and mark it READY before handover.`, 400, 'NOT_READY');
    }
    res.json({ success: true, data: { job } });
});
// ─── Report Problem ───────────────────────────────────────────────────────────
exports.reportProblem = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const job = await PrintJob_1.PrintJob.findById(req.params.id);
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    if (job.vendorId.toString() !== vendor._id.toString())
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'FAILED');
    job.status = 'FAILED';
    job.failedAt = new Date();
    job.problemNote = req.body.note || 'Printing problem';
    await job.save();
    emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
    res.json({ success: true, data: { job } });
});
// ─── Get Queue Position for a print job ──────────────────────────────────────
// GET /api/print-jobs/:id/queue-position
// Returns the student's position in the vendor's active queue.
// Only meaningful while job is in QUEUED, ACCEPTED, or PRINTING state.
// Students poll this + listen to queue:updated socket events.
const AVG_MINUTES_PER_JOB = 3; // Configurable default estimate
exports.getQueuePosition = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const job = await PrintJob_1.PrintJob.findById(req.params.id).lean();
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    // Authorization
    if (req.user.role === 'STUDENT' && job.studentId.toString() !== req.user._id) {
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    }
    // Only active queue positions make sense
    const activeStatuses = ['QUEUED', 'ACCEPTED', 'PRINTING'];
    if (!activeStatuses.includes(job.status)) {
        return res.json({
            success: true,
            data: {
                status: job.status,
                position: null,
                jobsAhead: 0,
                estimatedMinutes: 0,
                message: job.status === 'READY' ? 'Your prints are ready for pickup!' :
                    job.status === 'COLLECTED' ? 'Collected — done!' :
                        job.status === 'PAYMENT_PENDING' ? 'Awaiting payment confirmation' :
                            'Order is not currently in queue',
            },
        });
    }
    // Count jobs for same vendor in active statuses that were created BEFORE this job
    const jobsAhead = await PrintJob_1.PrintJob.countDocuments({
        vendorId: job.vendorId,
        status: { $in: activeStatuses },
        createdAt: { $lt: job.createdAt },
    });
    // Position is 1-indexed (1 = next to be served)
    const position = jobsAhead + 1;
    const estimatedMinutes = jobsAhead * AVG_MINUTES_PER_JOB;
    res.json({
        success: true,
        data: {
            status: job.status,
            position,
            jobsAhead,
            estimatedMinutes,
            message: position === 1
                ? 'You are next in queue!'
                : `${jobsAhead} job${jobsAhead === 1 ? '' : 's'} ahead of you`,
        },
    });
});
// GET /api/print-jobs/:id/payment-status
// Returns the authoritative payment + order status for a given print job.
// Used by the frontend to check if payment was confirmed without relying on
// Cashfree return URL query parameters.
exports.getJobPaymentStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const job = await PrintJob_1.PrintJob.findById(req.params.id)
        .populate('vendorId', 'shopName address')
        .lean();
    if (!job)
        throw (0, errorHandler_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
    // Authorization: student sees own jobs, vendor sees jobs for their store
    const role = req.user.role;
    const userId = req.user._id;
    if (role === 'STUDENT' && job.studentId.toString() !== userId) {
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    }
    if (role === 'VENDOR') {
        const vendor = await Vendor_1.Vendor.findOne({ userId });
        if (!vendor || job.vendorId.toString() !== vendor._id.toString()) {
            throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
        }
    }
    // Find associated payment record
    const paymentRecord = await Payment_1.Payment.findOne({ printJobId: job._id })
        .select('status amount paidAt gatewayOrderId')
        .lean();
    res.json({
        success: true,
        data: {
            orderId: job.publicToken,
            printJobId: job._id,
            orderStatus: job.status,
            paymentStatus: paymentRecord?.status ?? null,
            amount: paymentRecord?.amount ?? job.pricing?.total,
            paidAt: paymentRecord?.paidAt ?? null,
            vendor: job.vendorId?.shopName
                ? { shopName: job.vendorId.shopName, address: job.vendorId.address }
                : null,
        },
    });
});
// ─── Helper: Emit Socket events ───────────────────────────────────────────────
function getCleanId(val) {
    if (!val)
        return '';
    if (typeof val === 'object') {
        return (val._id || val.id || val).toString();
    }
    const str = String(val);
    const match = str.match(/[0-9a-fA-F]{24}/);
    return match ? match[0] : str;
}
function emitJobUpdate(vendorId, studentId, job) {
    try {
        const vId = getCleanId(vendorId);
        const sId = getCleanId(studentId);
        const io = (0, socketManager_1.getIO)();
        if (vId)
            io.to(`vendor:${vId}`).emit('printJob:updated', { job });
        if (sId)
            io.to(`student:${sId}`).emit('printJob:updated', { job });
    }
    catch (e) {
        // Socket not initialized
    }
}
// Emits queue:updated to the vendor room so all students with jobs at this vendor
// can re-fetch their queue positions. Called whenever any job at this vendor changes status.
function emitQueueUpdated(vendorId) {
    try {
        const vId = getCleanId(vendorId);
        const io = (0, socketManager_1.getIO)();
        // Emit to the vendor room — students listen for this event on the vendor they ordered from
        if (vId)
            io.to(`vendor:${vId}`).emit('queue:updated', { vendorId: vId });
    }
    catch {
        // Socket not initialized — non-fatal
    }
}
//# sourceMappingURL=printJobController.js.map