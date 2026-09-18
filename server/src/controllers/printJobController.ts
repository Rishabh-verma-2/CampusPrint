import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Vendor } from '../models/Vendor';
import { DocumentModel } from '../models/Document';
import { PrintJob } from '../models/PrintJob';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Settings } from '../models/Settings';
import { StorageService } from '../services/StorageService';
import { PricingService, parsePageRanges } from '../services/PricingService';
import { PrintJobStateMachine } from '../services/PrintJobStateMachine';
import { TokenService } from '../services/TokenService';
import { NotificationService } from '../services/NotificationService';
import { getIO } from '../sockets/socketManager';
import { v4 as uuidv4 } from 'uuid';

// ─── Create Print Job (QUEUED) ────────────────────────────────────────────────

export const createPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { documentId, documentIds, vendorId, printConfig } = req.body;

  // Resolve document IDs (supporting both multiple documents or single document)
  const docIds: string[] = Array.isArray(documentIds) && documentIds.length > 0
    ? documentIds
    : (documentId ? [documentId] : []);

  if (docIds.length === 0) {
    throw createError('At least one document is required', 400, 'DOCUMENT_REQUIRED');
  }

  // Verify document ownership & existence
  const documents = await DocumentModel.find({ _id: { $in: docIds } });
  if (documents.length !== docIds.length || documents.some((d) => d.isDeleted)) {
    throw createError('One or more documents not found or deleted', 404, 'DOCUMENT_NOT_FOUND');
  }

  for (const doc of documents) {
    if (doc.ownerId.toString() !== req.user!._id) {
      throw createError('Access denied for document', 403, 'FORBIDDEN');
    }
  }

  // Verify vendor exists, is active, and is open
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || vendor.status !== 'ACTIVE' || vendor.availability !== 'OPEN') {
    throw createError('Vendor not available', 400, 'VENDOR_UNAVAILABLE');
  }

  // Calculate total pages across all selected documents
  const combinedRawPages = documents.reduce((sum, d) => sum + (d.pageCount || 1), 0);
  let totalPages: number;
  try {
    if (documents.length === 1 && printConfig?.pageRanges && printConfig.pageRanges !== 'all') {
      totalPages = parsePageRanges(printConfig.pageRanges, documents[0].pageCount || 1);
    } else {
      totalPages = combinedRawPages;
    }
  } catch (e: unknown) {
    throw createError((e as Error).message, 400, 'INVALID_PAGE_RANGE');
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

  const feeDoc = await Settings.findOne({ key: { $in: ['platformFee', 'PLATFORM_FEE'] } }).lean();
  const platformFee = feeDoc?.value !== undefined ? Number(feeDoc.value) : 2;

  const pricing = PricingService.calculate(configWithPages, priceSnapshot, totalPages, platformFee);
  const publicToken = await TokenService.generateUniqueToken();

  const student = await User.findById(req.user!._id);
  const studentProfile = await StudentProfile.findOne({ userId: req.user!._id });

  const customerName = student?.name || 'Student';
  const customerIdentifier = studentProfile?.studentId || (student as any)?.enrollmentNumber || student?.phone || 'Guest';
  const customerPhone = student?.phone || '';
  const customerEnrollment = studentProfile?.studentId || (student as any)?.enrollmentNumber || '';

  const printJob = await PrintJob.create({
    publicToken,
    studentId: req.user!._id,
    customerName,
    customerIdentifier,
    customerPhone,
    customerEnrollment,
    vendorId: vendor._id,
    universityId: vendor.universityId,
    campusId: vendor.campusId,
    documentId: documents[0]._id,
    documentIds: documents.map((d) => d._id),
    status: 'PAYMENT_PENDING', // Job starts awaiting payment
    printConfig: configWithPages,
    priceSnapshot,
    pricing,
  });

  // NOTE: We do NOT emit to vendor or notify vendor here.
  // Vendor is only notified after payment is confirmed (handled in paymentController → transitionJobToPaid).
  // We do emit to the student so their UI can update.
  try {
    const io = (await import('../sockets/socketManager')).getIO();
    io.to(`student:${req.user!._id}`).emit('printJob:created', { job: printJob });
  } catch { /* Socket not initialized */ }

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

export const getMyPrintJobs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter: Record<string, unknown> = { studentId: req.user!._id };
  if (status) filter.status = status;

  const jobs = await PrintJob.find(filter)
    .populate('documentId', 'originalName fileSize pageCount')
    .populate('documentIds', 'originalName fileSize pageCount')
    .populate('vendorId', 'shopName address')
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  const total = await PrintJob.countDocuments(filter);

  res.json({ success: true, data: { jobs, total, page: Number(page), limit: Number(limit) } });
});

// ─── Get Single Print Job ─────────────────────────────────────────────────────

export const getPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id)
    .populate('documentId', 'originalName fileSize pageCount')
    .populate('documentIds', 'originalName fileSize pageCount')
    .populate('vendorId', 'shopName address phone')
    .populate('studentId', 'name email phone')
    .lean();

  if (!job) throw createError('Print job not found', 404, 'JOB_NOT_FOUND');

  // Authorization: student sees own jobs, vendor sees jobs assigned to them, admin sees all
  const role = req.user!.role;
  const userId = req.user!._id;

  if (role === 'STUDENT' && job.studentId._id?.toString() !== userId) {
    throw createError('Access denied', 403, 'FORBIDDEN');
  }
  if (role === 'VENDOR') {
    const vendor = await Vendor.findOne({ userId });
    if (!vendor || job.vendorId._id?.toString() !== vendor._id.toString()) {
      throw createError('Access denied', 403, 'FORBIDDEN');
    }
  }

  // Get signed URL for vendor
  let documentUrl: string | undefined;
  if (role === 'VENDOR' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    const docId = (job.documentId as any)?._id || job.documentId;
    const doc = await DocumentModel.findById(docId);
    if (doc) {
      documentUrl = await StorageService.getSignedUrl(doc.storageKey, doc.storageProvider);
    }
  }

  res.json({ success: true, data: { job, documentUrl } });
});

export const downloadPrintJobFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id);
  if (!job) throw createError('Print job not found', 404, 'JOB_NOT_FOUND');

  const role = req.user!.role;
  const userId = req.user!._id;

  if (role === 'STUDENT' && job.studentId.toString() !== userId) {
    throw createError('Access denied', 403, 'FORBIDDEN');
  }
  if (role === 'VENDOR') {
    const vendor = await Vendor.findOne({ userId });
    if (!vendor || job.vendorId.toString() !== vendor._id.toString()) {
      throw createError('Access denied', 403, 'FORBIDDEN');
    }
  }

  const docId = (job.documentId as any)?._id || job.documentId;
  const doc = await DocumentModel.findById(docId);
  if (!doc) throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');

  const fileUrl = await StorageService.getSignedUrl(doc.storageKey, doc.storageProvider);
  res.redirect(fileUrl);
});

// ─── Vendor: Accept Job ───────────────────────────────────────────────────────

export const acceptPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const job = await PrintJob.findById(req.params.id);
  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');
  if (job.vendorId.toString() !== vendor._id.toString()) {
    throw createError('Access denied', 403, 'FORBIDDEN');
  }

  // PAYMENT GUARD: Vendor cannot accept unpaid jobs
  if (job.status === 'PAYMENT_PENDING') {
    throw createError('Cannot accept job: payment has not been completed', 400, 'PAYMENT_REQUIRED');
  }

  PrintJobStateMachine.assertTransition(job.status, 'ACCEPTED');
  job.status = 'ACCEPTED';
  job.acceptedAt = new Date();
  await job.save();

  emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
  await NotificationService.create(
    job.studentId.toString(),
    'JOB_ACCEPTED',
    'Print Job Accepted',
    `Your print job ${job.publicToken} has been accepted by the vendor.`,
    { jobId: job._id }
  );

  res.json({ success: true, data: { job } });
});

// ─── Vendor: Start Printing ───────────────────────────────────────────────────

export const startPrinting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const job = await PrintJob.findById(req.params.id);
  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');
  if (job.vendorId.toString() !== vendor._id.toString()) throw createError('Forbidden', 403, 'FORBIDDEN');

  // PAYMENT GUARD: Cannot start printing without payment
  if (job.status === 'PAYMENT_PENDING') {
    throw createError('Cannot start printing: payment has not been completed', 400, 'PAYMENT_REQUIRED');
  }

  PrintJobStateMachine.assertTransition(job.status, 'PRINTING');
  job.status = 'PRINTING';
  job.printingStartedAt = new Date();
  await job.save();

  emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
  res.json({ success: true, data: { job } });
});

// ─── Vendor: Mark Ready ───────────────────────────────────────────────────────

export const markReady = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const job = await PrintJob.findById(req.params.id);
  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');
  if (job.vendorId.toString() !== vendor._id.toString()) throw createError('Forbidden', 403, 'FORBIDDEN');

  PrintJobStateMachine.assertTransition(job.status, 'READY');
  job.status = 'READY';
  job.readyAt = new Date();
  await job.save();

  emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
  await NotificationService.create(
    job.studentId.toString(),
    'JOB_READY',
    'Your print is ready',
    `Your print job ${job.publicToken} is ready for pickup at the vendor.`,
    { jobId: job._id }
  );

  res.json({ success: true, data: { job } });
});

// ─── Vendor: Cancel Job ───────────────────────────────────────────────────────

export const cancelPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id);
  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');

  // Student or vendor can cancel (within allowed states)
  const role = req.user!.role;
  if (role === 'STUDENT' && job.studentId.toString() !== req.user!._id) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }
  if (role === 'VENDOR') {
    const vendor = await Vendor.findOne({ userId: req.user!._id });
    if (!vendor || job.vendorId.toString() !== vendor._id.toString()) {
      throw createError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  PrintJobStateMachine.assertTransition(job.status, 'CANCELLED');
  job.status = 'CANCELLED';
  job.cancelledAt = new Date();
  job.cancellationReason = req.body.reason || 'Cancelled';
  await job.save();

  emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
  res.json({ success: true, data: { job } });
});

// ─── Vendor: Collect (Pickup Verification) ────────────────────────────────────

export const collectPrintJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const job = await PrintJob.findById(req.params.id)
    .populate('studentId', 'name phone enrollmentNumber');

  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');
  if (job.vendorId.toString() !== vendor._id.toString()) throw createError('Forbidden', 403, 'FORBIDDEN');
  if (job.status !== 'READY') throw createError('Job is not ready for pickup', 400, 'NOT_READY');

  // Verify token (handles with or without CP- prefix)
  const normalizedInput = token?.trim().toUpperCase();
  const validTokens = [normalizedInput, `CP-${normalizedInput}`];
  if (token && !validTokens.includes(job.publicToken)) {
    throw createError('Invalid token', 400, 'INVALID_TOKEN');
  }

  PrintJobStateMachine.assertTransition(job.status, 'COLLECTED');
  job.status = 'COLLECTED';
  job.collectedAt = new Date();
  await job.save();

  emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
  await NotificationService.create(
    job.studentId.toString(),
    'JOB_COLLECTED',
    'Pickup Confirmed',
    `Your print job ${job.publicToken} has been collected. Thank you for using CampusPrint!`,
    { jobId: job._id }
  );

  res.json({ success: true, data: { job } });
});

// ─── Vendor: Verify Token (pre-collect) ──────────────────────────────────────

export const verifyPickupToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const rawToken = token?.trim().toUpperCase();
  const tokenQuery = rawToken?.startsWith('CP-') ? rawToken : `CP-${rawToken}`;

  const job = await PrintJob.findOne({
    $or: [{ publicToken: rawToken }, { publicToken: tokenQuery }],
  })
    .populate('studentId', 'name email phone enrollmentNumber')
    .populate('documentId', 'originalName pageCount')
    .populate('documentIds', 'originalName pageCount');

  if (!job) throw createError('Invalid token', 404, 'INVALID_TOKEN');
  if (job.vendorId.toString() !== vendor._id.toString()) throw createError('Forbidden', 403, 'FORBIDDEN');
  if (job.status !== 'READY') throw createError('Job is not ready for pickup', 400, 'NOT_READY');

  res.json({ success: true, data: { job } });
});

// ─── Report Problem ───────────────────────────────────────────────────────────

export const reportProblem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const job = await PrintJob.findById(req.params.id);
  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');
  if (job.vendorId.toString() !== vendor._id.toString()) throw createError('Forbidden', 403, 'FORBIDDEN');

  PrintJobStateMachine.assertTransition(job.status, 'FAILED');
  job.status = 'FAILED';
  job.failedAt = new Date();
  job.problemNote = req.body.note || 'Printing problem';
  await job.save();

  emitJobUpdate(job.vendorId.toString(), job.studentId.toString(), job);
  res.json({ success: true, data: { job } });
});

// ─── Helper: Emit Socket events ───────────────────────────────────────────────

function emitJobUpdate(vendorId: string, studentId: string, job: unknown) {
  try {
    const io = getIO();
    io.to(`vendor:${vendorId}`).emit('printJob:updated', { job });
    io.to(`student:${studentId}`).emit('printJob:updated', { job });
  } catch (e) {
    // Socket not initialized
  }
}
