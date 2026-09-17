"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportProblem = exports.verifyPickupToken = exports.collectPrintJob = exports.cancelPrintJob = exports.markReady = exports.startPrinting = exports.acceptPrintJob = exports.getPrintJob = exports.getMyPrintJobs = exports.createPrintJob = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const Vendor_1 = require("../models/Vendor");
const Document_1 = require("../models/Document");
const PrintJob_1 = require("../models/PrintJob");
const User_1 = require("../models/User");
const StudentProfile_1 = require("../models/StudentProfile");
const StorageService_1 = require("../services/StorageService");
const PricingService_1 = require("../services/PricingService");
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
    let totalPages;
    try {
        if (documents.length === 1 && printConfig?.pageRanges && printConfig.pageRanges !== 'all') {
            totalPages = (0, PricingService_1.parsePageRanges)(printConfig.pageRanges, documents[0].pageCount || 1);
        }
        else {
            totalPages = combinedRawPages;
        }
    }
    catch (e) {
        throw (0, errorHandler_1.createError)(e.message, 400, 'INVALID_PAGE_RANGE');
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
    const pricing = PricingService_1.PricingService.calculate(configWithPages, priceSnapshot, totalPages);
    const publicToken = await TokenService_1.TokenService.generateUniqueToken();
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
        documentId: documents[0]._id,
        documentIds: documents.map((d) => d._id),
        status: 'QUEUED',
        printConfig: configWithPages,
        priceSnapshot,
        pricing,
    });
    // Emit real-time event to vendor and student
    emitJobUpdate(vendor._id.toString(), req.user._id, printJob);
    // Send notification to vendor
    try {
        await NotificationService_1.NotificationService.create(vendor.userId.toString(), 'JOB_QUEUED', 'New Print Job Received', `New print job ${printJob.publicToken} from ${customerName} is waiting in your queue.`, { jobId: printJob._id, token: printJob.publicToken });
    }
    catch (err) {
        // Ignore notification failure if vendor user not found
    }
    res.status(201).json({
        success: true,
        data: {
            printJob: {
                _id: printJob._id,
                publicToken: printJob.publicToken,
                status: printJob.status,
                pricing: printJob.pricing,
                printConfig: printJob.printConfig,
                vendorId: {
                    _id: vendor._id,
                    shopName: vendor.shopName,
                    address: vendor.address,
                },
                documentId: documents[0],
                documentIds: documents,
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
        .populate('documentId', 'originalName fileSize pageCount')
        .populate('documentIds', 'originalName fileSize pageCount')
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
    // Get signed URL for vendor
    let documentUrl;
    if (role === 'VENDOR' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
        const doc = await Document_1.DocumentModel.findById(job.documentId);
        if (doc) {
            documentUrl = await StorageService_1.StorageService.getSignedUrl(doc.storageKey, doc.storageProvider);
        }
    }
    res.json({ success: true, data: { job, documentUrl } });
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
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'ACCEPTED');
    job.status = 'ACCEPTED';
    job.acceptedAt = new Date();
    await job.save();
    emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
    await NotificationService_1.NotificationService.create(job.studentId.toString(), 'JOB_ACCEPTED', 'Print Job Accepted', `Your print job ${job.publicToken} has been accepted by the vendor.`, { jobId: job._id });
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
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'PRINTING');
    job.status = 'PRINTING';
    job.printingStartedAt = new Date();
    await job.save();
    emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
    res.json({ success: true, data: { job } });
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
    emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
    await NotificationService_1.NotificationService.create(job.studentId.toString(), 'JOB_READY', 'Your print is ready', `Your print job ${job.publicToken} is ready for pickup at the vendor.`, { jobId: job._id });
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
    if (job.status !== 'READY')
        throw (0, errorHandler_1.createError)('Job is not ready for pickup', 400, 'NOT_READY');
    // Verify token (handles with or without CP- prefix)
    const normalizedInput = token?.trim().toUpperCase();
    const validTokens = [normalizedInput, `CP-${normalizedInput}`];
    if (token && !validTokens.includes(job.publicToken)) {
        throw (0, errorHandler_1.createError)('Invalid token', 400, 'INVALID_TOKEN');
    }
    PrintJobStateMachine_1.PrintJobStateMachine.assertTransition(job.status, 'COLLECTED');
    job.status = 'COLLECTED';
    job.collectedAt = new Date();
    await job.save();
    emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
    await NotificationService_1.NotificationService.create(job.studentId.toString(), 'JOB_COLLECTED', 'Pickup Confirmed', `Your print job ${job.publicToken} has been collected. Thank you for using CampusPrint!`, { jobId: job._id });
    res.json({ success: true, data: { job } });
});
// ─── Vendor: Verify Token (pre-collect) ──────────────────────────────────────
exports.verifyPickupToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const rawToken = token?.trim().toUpperCase();
    const tokenQuery = rawToken?.startsWith('CP-') ? rawToken : `CP-${rawToken}`;
    const job = await PrintJob_1.PrintJob.findOne({
        $or: [{ publicToken: rawToken }, { publicToken: tokenQuery }],
    })
        .populate('studentId', 'name email phone enrollmentNumber')
        .populate('documentId', 'originalName pageCount')
        .populate('documentIds', 'originalName pageCount');
    if (!job)
        throw (0, errorHandler_1.createError)('Invalid token', 404, 'INVALID_TOKEN');
    if (job.vendorId.toString() !== vendor._id.toString())
        throw (0, errorHandler_1.createError)('Forbidden', 403, 'FORBIDDEN');
    if (job.status !== 'READY')
        throw (0, errorHandler_1.createError)('Job is not ready for pickup', 400, 'NOT_READY');
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
// ─── Helper: Emit Socket events ───────────────────────────────────────────────
function emitJobUpdate(vendorId, studentId, job) {
    try {
        const io = (0, socketManager_1.getIO)();
        io.to(`vendor:${vendorId}`).emit('printJob:updated', { job });
        io.to(`student:${studentId}`).emit('printJob:updated', { job });
    }
    catch (e) {
        // Socket not initialized
    }
}
//# sourceMappingURL=printJobController.js.map