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
import { PrintJobStatus } from '../types';
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
  const publicToken = await TokenService.generateUniqueToken(vendor._id.toString());

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

  // Get signed URL for vendor (never provided for COLLECTED jobs)
  let documentUrl: string | undefined;
  if ((role === 'VENDOR' || role === 'ADMIN' || role === 'SUPER_ADMIN') && job.status !== 'COLLECTED') {
    const docId = (job.documentId as any)?._id || job.documentId;
    if (docId) {
      const doc = await DocumentModel.findById(docId);
      if (doc) {
        documentUrl = await StorageService.getSignedUrl(doc.storageKey, doc.storageProvider);
      }
    }
  }

  res.json({ success: true, data: { job, documentUrl } });
});

export const downloadPrintJobFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id);
  if (!job) throw createError('Print job not found', 404, 'JOB_NOT_FOUND');

  // Once a job is completed / COLLECTED, documents are permanently deleted for privacy
  if (job.status === 'COLLECTED') {
    throw createError('Document has been permanently deleted after pickup completion', 410, 'DOCUMENT_DELETED');
  }

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
  if (!doc) throw createError('Document not found or already deleted', 404, 'DOCUMENT_NOT_FOUND');

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

  const vId = getCleanId(job.vendorId);
  const sId = getCleanId(job.studentId);
  emitJobUpdate(vId, sId, job);
  emitQueueUpdated(vId);
  await NotificationService.create(
    sId,
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
  job.acceptedAt = job.acceptedAt || new Date();
  job.printingStartedAt = new Date();
  await job.save();

  const vId = getCleanId(job.vendorId);
  const sId = getCleanId(job.studentId);
  emitJobUpdate(vId, sId, job);
  emitQueueUpdated(vId);

  // Generate signed document URL for immediate opening/printing
  let documentUrl: string | undefined;
  const docId = (job.documentId as any)?._id || job.documentId;
  if (docId) {
    const doc = await DocumentModel.findById(docId);
    if (doc) {
      documentUrl = await StorageService.getSignedUrl(doc.storageKey, doc.storageProvider);
    }
  }

  await NotificationService.create(
    sId,
    'JOB_PRINTING',
    'Printing Started',
    `Your print job ${job.publicToken} is now printing!`,
    { jobId: job._id }
  );

  res.json({ success: true, data: { job, documentUrl } });
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

  const vId = getCleanId(job.vendorId);
  const sId = getCleanId(job.studentId);
  emitJobUpdate(vId, sId, job);
  emitQueueUpdated(vId);
  await NotificationService.create(
    sId,
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

  // Idempotent: If already COLLECTED (double-click or network retry), return success
  if (job.status === 'COLLECTED') {
    return res.json({ success: true, data: { job } });
  }

  if (job.status !== 'READY') {
    throw createError(
      `Job ${job.publicToken} is currently in '${job.status}' status. Only orders marked 'READY' can be collected.`,
      400,
      'NOT_READY'
    );
  }

  // Verify token — accept various input formats: '3', '03', 'CP-03', 'cp-3'
  if (token) {
    const cleanToken = token.trim().toUpperCase();
    const tokenCandidates = TokenService.normalizeInputToken(cleanToken);
    const tokenMatches =
      tokenCandidates.includes(job.publicToken.toUpperCase()) ||
      cleanToken === job.publicToken.toUpperCase() ||
      cleanToken === job.publicToken.replace('CP-', '').toUpperCase();
    if (!tokenMatches) {
      throw createError(`Invalid token. Expected ${job.publicToken}, got "${token}"`, 400, 'INVALID_TOKEN');
    }
  }

  PrintJobStateMachine.assertTransition(job.status, 'COLLECTED');
  job.status = 'COLLECTED';
  job.collectedAt = new Date();
  await job.save();

  // ─── Clean up document from Database & Cloudinary ─────────────────────────
  // Permanently delete PDF files from Cloudinary and remove Document records from DB
  const docIdsToClean: string[] = [];
  if (job.documentId) {
    const dId = (job.documentId as any)?._id || job.documentId;
    docIdsToClean.push(dId.toString());
  }
  if (Array.isArray(job.documentIds) && job.documentIds.length > 0) {
    for (const d of job.documentIds) {
      const dId = (d as any)?._id || d;
      if (dId && !docIdsToClean.includes(dId.toString())) {
        docIdsToClean.push(dId.toString());
      }
    }
  }

  for (const docId of docIdsToClean) {
    try {
      const doc = await DocumentModel.findById(docId);
      if (doc) {
        // Check if any other non-collected job is still using this document
        const otherActiveJob = await PrintJob.findOne({
          _id: { $ne: job._id },
          status: { $nin: ['COLLECTED', 'CANCELLED', 'FAILED'] },
          $or: [{ documentId: doc._id }, { documentIds: doc._id }],
        });

        if (!otherActiveJob) {
          console.log(`[Collect] Permanently deleting PDF from ${doc.storageProvider}: ${doc.storageKey}`);
          await StorageService.delete(doc.storageKey, doc.storageProvider);
          await DocumentModel.findByIdAndDelete(doc._id);
          console.log(`[Collect] Document record ${doc._id} permanently deleted from DB`);
        } else {
          console.log(`[Collect] Document ${doc._id} is still in use by job ${otherActiveJob.publicToken}`);
        }
      }
    } catch (err: any) {
      console.warn(`[Collect] Non-fatal error deleting document ${docId}:`, err?.message);
    }
  }

  const vId = getCleanId(job.vendorId);
  const sId = getCleanId(job.studentId);
  emitJobUpdate(vId, sId, job);
  emitQueueUpdated(vId); // queue positions shift
  await NotificationService.create(
    sId,
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
  const tokenCandidates = TokenService.normalizeInputToken(rawToken || '');

  // Scope search to THIS vendor's jobs and match against normalized candidates
  const job = await PrintJob.findOne({
    vendorId: vendor._id,
    publicToken: { $in: [...tokenCandidates, rawToken] },
  })
    .populate('studentId', 'name email phone enrollmentNumber')
    .populate('documentId', 'originalName pageCount')
    .populate('documentIds', 'originalName pageCount');

  if (!job) {
    throw createError(`Token "${token}" not found for your store`, 404, 'INVALID_TOKEN');
  }

  if (job.status === 'COLLECTED') {
    throw createError(`Order ${job.publicToken} has already been collected and completed`, 400, 'ALREADY_COLLECTED');
  }

  if (job.status !== 'READY') {
    throw createError(
      `Order ${job.publicToken} is currently '${job.status}'. Please print and mark it READY before handover.`,
      400,
      'NOT_READY'
    );
  }

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

// ─── Get Queue Position for a print job ──────────────────────────────────────
// GET /api/print-jobs/:id/queue-position
// Returns the student's position in the vendor's active queue.
// Only meaningful while job is in QUEUED, ACCEPTED, or PRINTING state.
// Students poll this + listen to queue:updated socket events.

const AVG_MINUTES_PER_JOB = 3; // Configurable default estimate

export const getQueuePosition = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id).lean();
  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');

  // Authorization
  if (req.user!.role === 'STUDENT' && job.studentId.toString() !== req.user!._id) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }

  // Only active queue positions make sense
  const activeStatuses: PrintJobStatus[] = ['QUEUED', 'ACCEPTED', 'PRINTING'];
  if (!activeStatuses.includes(job.status as PrintJobStatus)) {
    return res.json({
      success: true,
      data: {
        status: job.status,
        position: null,
        jobsAhead: 0,
        estimatedMinutes: 0,
        message:
          job.status === 'READY' ? 'Your prints are ready for pickup!' :
          job.status === 'COLLECTED' ? 'Collected — done!' :
          job.status === 'PAYMENT_PENDING' ? 'Awaiting payment confirmation' :
          'Order is not currently in queue',
      },
    });
  }

  // Count jobs for same vendor in active statuses that were created BEFORE this job
  const jobsAhead = await PrintJob.countDocuments({
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
      message:
        position === 1
          ? 'You are next in queue!'
          : `${jobsAhead} job${jobsAhead === 1 ? '' : 's'} ahead of you`,
    },
  });
});
// GET /api/print-jobs/:id/payment-status
// Returns the authoritative payment + order status for a given print job.
// Used by the frontend to check if payment was confirmed without relying on
// Cashfree return URL query parameters.

export const getJobPaymentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id)
    .populate('vendorId', 'shopName address')
    .lean();

  if (!job) throw createError('Job not found', 404, 'JOB_NOT_FOUND');

  // Authorization: student sees own jobs, vendor sees jobs for their store
  const role = req.user!.role;
  const userId = req.user!._id;

  if (role === 'STUDENT' && job.studentId.toString() !== userId) {
    throw createError('Forbidden', 403, 'FORBIDDEN');
  }
  if (role === 'VENDOR') {
    const vendor = await Vendor.findOne({ userId });
    if (!vendor || job.vendorId.toString() !== vendor._id.toString()) {
      throw createError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  // Find associated payment record
  const paymentRecord = await Payment.findOne({ printJobId: job._id })
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
      vendor: (job.vendorId as any)?.shopName
        ? { shopName: (job.vendorId as any).shopName, address: (job.vendorId as any).address }
        : null,
    },
  });
});

// ─── Helper: Emit Socket events ───────────────────────────────────────────────

function getCleanId(val: any): string {
  if (!val) return '';
  if (typeof val === 'object') {
    return (val._id || val.id || val).toString();
  }
  const str = String(val);
  const match = str.match(/[0-9a-fA-F]{24}/);
  return match ? match[0] : str;
}

function emitJobUpdate(vendorId: any, studentId: any, job: unknown) {
  try {
    const vId = getCleanId(vendorId);
    const sId = getCleanId(studentId);
    const io = getIO();
    if (vId) io.to(`vendor:${vId}`).emit('printJob:updated', { job });
    if (sId) io.to(`student:${sId}`).emit('printJob:updated', { job });
  } catch (e) {
    // Socket not initialized
  }
}

// Emits queue:updated to the vendor room so all students with jobs at this vendor
// can re-fetch their queue positions. Called whenever any job at this vendor changes status.
function emitQueueUpdated(vendorId: any) {
  try {
    const vId = getCleanId(vendorId);
    const io = getIO();
    // Emit to the vendor room — students listen for this event on the vendor they ordered from
    if (vId) io.to(`vendor:${vId}`).emit('queue:updated', { vendorId: vId });
  } catch {
    // Socket not initialized — non-fatal
  }
}

