import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Vendor } from '../models/Vendor';
import { PrintJob } from '../models/PrintJob';

// ─── Public: List Vendors ──────────────────────────────────────────────────────

export const getVendors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { campusId, universityId } = req.query;
  const filter: Record<string, unknown> = {
    status: 'ACTIVE',
    isActive: true,
  };
  if (campusId) filter.campusId = campusId;
  if (universityId) filter.universityId = universityId;

  const vendors = await Vendor.find(filter)
    .populate('campusId', 'name')
    .populate('universityId', 'name')
    .select('-userId')
    .lean();

  res.json({ success: true, data: { vendors } });
});

// ─── Public: Single Vendor ─────────────────────────────────────────────────────

export const getVendorById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findById(req.params.id)
    .populate('campusId', 'name')
    .populate('universityId', 'name')
    .select('-userId')
    .lean();

  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  res.json({ success: true, data: { vendor } });
});

// ─── Public: Vendor Pricing ────────────────────────────────────────────────────

export const getVendorPricing = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findById(req.params.id).select('pricing').lean();
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  res.json({ success: true, data: { pricing: vendor.pricing } });
});

// ─── Vendor: Dashboard Stats ──────────────────────────────────────────────────

export const getVendorDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id })
    .populate('campusId', 'name')
    .populate('universityId', 'name');
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalToday, pending, printing, ready, completed] = await Promise.all([
    PrintJob.countDocuments({ vendorId: vendor._id, createdAt: { $gte: today } }),
    PrintJob.countDocuments({ vendorId: vendor._id, status: 'QUEUED' }),
    PrintJob.countDocuments({ vendorId: vendor._id, status: { $in: ['ACCEPTED', 'PRINTING'] } }),
    PrintJob.countDocuments({ vendorId: vendor._id, status: 'READY' }),
    PrintJob.countDocuments({ vendorId: vendor._id, status: 'COLLECTED', createdAt: { $gte: today } }),
  ]);

  // Today's confirmed revenue — counts from QUEUED onwards since payment is captured at order time
  // (Cashfree charges the student immediately; vendor's earnings are confirmed when job is QUEUED)
  const revenueAgg = await PrintJob.aggregate([
    {
      $match: {
        vendorId: vendor._id,
        status: { $in: ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY', 'COLLECTED'] },
        createdAt: { $gte: today },
      },
    },
    { $group: { _id: null, total: { $sum: '$pricing.vendorAmount' } } },
  ]);
  const todayRevenue = revenueAgg[0]?.total || 0;

  // Recent jobs for quick dashboard feed
  const recentJobs = await PrintJob.find({ vendorId: vendor._id })
    .populate('studentId', 'name phone enrollmentNumber')
    .populate('documentId', 'originalName pageCount fileSize')
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  res.json({
    success: true,
    data: {
      vendor: {
        _id: vendor._id,
        shopName: vendor.shopName,
        ownerName: vendor.ownerName,
        phone: vendor.phone,
        address: vendor.address,
        availability: vendor.availability,
        status: vendor.status,
        pricing: vendor.pricing,
        operatingHours: vendor.operatingHours,
        campus: vendor.campusId,
        university: vendor.universityId,
      },
      stats: { totalToday, pending, printing, ready, completed, todayRevenue },
      recentJobs,
    },
  });
});

// ─── Vendor: Get Profile ──────────────────────────────────────────────────────

export const getVendorProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id })
    .populate('userId', 'email phone name')
    .populate('campusId', 'name')
    .populate('universityId', 'name')
    .lean();

  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  res.json({ success: true, data: { vendor } });
});

// ─── Vendor: Get Queue ────────────────────────────────────────────────────────

export const getVendorQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const { status, page = 1, limit = 20, sort = 'oldest' } = req.query;

  const filter: Record<string, unknown> = { vendorId: vendor._id };
  let sortDir: 1 | -1 = sort === 'newest' ? -1 : 1;

  if (status && status !== 'all') {
    const s = (status as string).toLowerCase();
    if (s === 'new') {
      filter.status = 'QUEUED';
    } else if (s === 'printing') {
      filter.status = { $in: ['ACCEPTED', 'PRINTING'] };
    } else if (s === 'ready') {
      filter.status = 'READY';
    } else if (s === 'completed' || s === 'collected') {
      filter.status = 'COLLECTED';
      // For completed jobs, show most recent completions first by default
      if (sort === 'oldest') sortDir = -1;
    } else {
      filter.status = (status as string).toUpperCase();
    }
  } else {
    filter.status = { $in: ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY'] };
  }

  const jobs = await PrintJob.find(filter)
    .populate('studentId', 'name phone enrollmentNumber')
    .populate('documentId', 'originalName pageCount fileSize')
    .sort({ createdAt: sortDir })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  const total = await PrintJob.countDocuments(filter);

  res.json({ success: true, data: { jobs, total } });
});

// ─── Vendor: Update Pricing ────────────────────────────────────────────────────

export const updateVendorPricing = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const { bwPerPage, colorPerPage, duplexDiscount } = req.body;
  vendor.pricing = {
    bwPerPage: bwPerPage ?? vendor.pricing.bwPerPage,
    colorPerPage: colorPerPage ?? vendor.pricing.colorPerPage,
    duplexDiscount: duplexDiscount ?? vendor.pricing.duplexDiscount,
  };
  await vendor.save();

  res.json({ success: true, data: { pricing: vendor.pricing } });
});

// ─── Vendor: Update Availability ──────────────────────────────────────────────

export const updateVendorAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  vendor.availability = req.body.availability;
  await vendor.save();
  res.json({ success: true, data: { availability: vendor.availability } });
});

// ─── Vendor: Update Profile ────────────────────────────────────────────────────

export const updateVendorProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const allowed = ['shopName', 'ownerName', 'phone', 'address', 'operatingHours'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (vendor as any)[key] = req.body[key];
    }
  }
  await vendor.save();
  res.json({ success: true, data: { vendor } });
});

// ─── Vendor: Analytics ────────────────────────────────────────────────────────

export const getVendorAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findOne({ userId: req.user!._id });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const { period = '7d' } = req.query;
  const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const [revenueByDay, printTypeAgg] = await Promise.all([
    PrintJob.aggregate([
      {
        $match: {
          vendorId: vendor._id,
          status: { $in: ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY', 'COLLECTED'] },
          createdAt: { $gte: from },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.vendorAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    PrintJob.aggregate([
      { $match: { vendorId: vendor._id, createdAt: { $gte: from } } },
      { $group: { _id: '$printConfig.colorMode', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: { revenueByDay, printTypeDistribution: printTypeAgg, period },
  });
});
