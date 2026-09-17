import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/authenticate';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { User } from '../models/User';
import { Vendor } from '../models/Vendor';
import { PrintJob } from '../models/PrintJob';
import { Payment } from '../models/Payment';
import { University } from '../models/University';
import { Campus } from '../models/Campus';
import { AuditLog } from '../models/AuditLog';
import { Complaint } from '../models/Complaint';
import { Settings, DEFAULT_SETTINGS } from '../models/Settings';
import { StudentProfile } from '../models/StudentProfile';

const logAction = async (
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) => {
  try {
    await AuditLog.create({ actorId, action, entityType, entityId, metadata });
  } catch (err) {
    // Non-blocking
  }
};

// ─── 1. Admin Dashboard ───────────────────────────────────────────────────────

export const getAdminDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Parul University context
  const university = await University.findOne({ code: 'PU' }) || await University.findOne();

  // 2. 8 Real-time KPI Stats
  const [
    totalStudents,
    activeVendors,
    todayJobs,
    pendingJobs,
    completedJobs,
    cancelledJobs,
  ] = await Promise.all([
    User.countDocuments({ role: 'STUDENT', isActive: true }),
    Vendor.countDocuments({ status: 'ACTIVE' }),
    PrintJob.countDocuments({ createdAt: { $gte: today } }),
    PrintJob.countDocuments({ status: { $in: ['QUEUED', 'ACCEPTED', 'PRINTING'] } }),
    PrintJob.countDocuments({ status: 'COLLECTED', createdAt: { $gte: today } }),
    PrintJob.countDocuments({ status: 'CANCELLED', createdAt: { $gte: today } }),
  ]);

  // Real-time Revenue calculation (only successful collected/paid jobs)
  const revenueAgg = await PrintJob.aggregate([
    { $match: { status: 'COLLECTED', createdAt: { $gte: today } } },
    { $group: { _id: null, total: { $sum: '$pricing.total' }, platform: { $sum: '$pricing.platformFee' } } },
  ]);

  const todayRevenue = revenueAgg[0]?.total || 0;
  const todayPlatformFee = revenueAgg[0]?.platform || 0;

  // 3. Last 7 Days Orders & Revenue Trends
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const rawDaily = await PrintJob.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [{ $eq: ['$status', 'COLLECTED'] }, '$pricing.total', 0],
          },
        },
      },
    },
  ]);

  const dailyMap = new Map(rawDaily.map((d) => [d._id, d]));
  const orders7Days = [];
  const revenue7Days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const matched = dailyMap.get(dateKey);

    orders7Days.push({
      date: dateKey,
      label,
      orders: matched?.orders || 0,
    });

    revenue7Days.push({
      date: dateKey,
      label,
      revenue: matched?.revenue || 0,
    });
  }

  // 4. Status Distribution Breakdown
  const rawStatus = await PrintJob.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statusMap = new Map(rawStatus.map((s) => [s._id, s.count]));

  const statusDistribution = [
    { status: 'QUEUED', label: 'Queued', count: statusMap.get('QUEUED') || 0, color: '#f59e0b' },
    { status: 'ACCEPTED', label: 'Accepted', count: statusMap.get('ACCEPTED') || 0, color: '#3b82f6' },
    { status: 'PRINTING', label: 'Printing', count: statusMap.get('PRINTING') || 0, color: '#8b5cf6' },
    { status: 'READY', label: 'Ready', count: statusMap.get('READY') || 0, color: '#06b6d4' },
    { status: 'COLLECTED', label: 'Completed', count: statusMap.get('COLLECTED') || 0, color: '#10b981' },
    { status: 'CANCELLED', label: 'Cancelled', count: statusMap.get('CANCELLED') || 0, color: '#ef4444' },
  ];

  // 5. Recent Orders
  const recentOrders = await PrintJob.find()
    .populate('studentId', 'name email phone enrollmentNumber')
    .populate('vendorId', 'shopName address')
    .populate('documentId', 'originalName fileSize pageCount')
    .populate('documentIds', 'originalName fileSize pageCount')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  res.json({
    success: true,
    data: {
      university: {
        _id: university?._id,
        name: university?.name || 'Parul University',
        code: university?.code || 'PU',
        location: university?.location || 'Vadodara, Gujarat',
      },
      stats: {
        totalStudents,
        activeVendors,
        todayJobs,
        todayRevenue,
        pendingJobs,
        completedJobs,
        cancelledJobs,
        todayPlatformFee,
      },
      orders7Days,
      revenue7Days,
      statusDistribution,
      recentOrders,
    },
  });
});

// ─── 2. Universities ──────────────────────────────────────────────────────────

export const getUniversities = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const universities = await University.find().lean();

  // Attach real metrics for each university
  const enriched = await Promise.all(
    universities.map(async (uni) => {
      const [studentCount, vendorCount, orderCount] = await Promise.all([
        User.countDocuments({ role: 'STUDENT', universityId: uni._id }),
        Vendor.countDocuments({ universityId: uni._id }),
        PrintJob.countDocuments({ universityId: uni._id }),
      ]);
      return {
        ...uni,
        studentCount,
        vendorCount,
        orderCount,
      };
    })
  );

  res.json({ success: true, data: { universities: enriched } });
});

export const getUniversityById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await University.findById(req.params.id).lean();
  if (!university) throw createError('University not found', 404, 'UNIVERSITY_NOT_FOUND');

  const campuses = await Campus.find({ universityId: university._id }).lean();
  const [studentCount, vendorCount, orderCount] = await Promise.all([
    User.countDocuments({ role: 'STUDENT', universityId: university._id }),
    Vendor.countDocuments({ universityId: university._id }),
    PrintJob.countDocuments({ universityId: university._id }),
  ]);

  res.json({
    success: true,
    data: {
      university: {
        ...university,
        campuses,
        studentCount,
        vendorCount,
        orderCount,
      },
    },
  });
});

export const createUniversity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const university = await University.create(req.body);
  await logAction(req.user!._id, 'CREATE_UNIVERSITY', 'University', university._id.toString(), req.body);
  res.status(201).json({ success: true, data: { university } });
});

export const getCampuses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { universityId } = req.query;
  const filter: Record<string, unknown> = {};
  if (universityId) filter.universityId = universityId as string;
  const campuses = await Campus.find(filter as any).populate('universityId', 'name').lean();
  res.json({ success: true, data: { campuses } });
});

export const createCampus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const campus = await Campus.create(req.body);
  await logAction(req.user!._id, 'CREATE_CAMPUS', 'Campus', campus._id.toString(), req.body);
  res.status(201).json({ success: true, data: { campus } });
});

// ─── 3. Vendors Management ────────────────────────────────────────────────────

export const getAdminVendors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const filter: Record<string, unknown> = {};

  if (status && status !== 'ALL') filter.status = status;
  if (search) {
    filter.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(filter)
      .populate('userId', 'name email phone')
      .populate('campusId', 'name')
      .populate('universityId', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Vendor.countDocuments(filter),
  ]);

  // Enrich with live orders and revenue counts
  const enriched = await Promise.all(
    vendors.map(async (v) => {
      const [orderCount, revenueAgg] = await Promise.all([
        PrintJob.countDocuments({ vendorId: v._id }),
        PrintJob.aggregate([
          { $match: { vendorId: v._id, status: 'COLLECTED' } },
          { $group: { _id: null, total: { $sum: '$pricing.vendorAmount' } } },
        ]),
      ]);

      return {
        ...v,
        ordersCount: orderCount,
        revenue: revenueAgg[0]?.total || 0,
      };
    })
  );

  res.json({ success: true, data: { vendors: enriched, total } });
});

export const updateVendorStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const vendorId = req.params.id as string;

  if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
    throw createError('Invalid vendor status', 400, 'INVALID_STATUS');
  }

  const updateFields: Record<string, unknown> = { status };
  if (status === 'SUSPENDED') {
    updateFields.availability = 'CLOSED';
  }

  const vendor = await Vendor.findByIdAndUpdate(vendorId, updateFields, { new: true });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  await logAction(
    req.user!._id,
    status === 'ACTIVE' ? 'ADMIN_ACTIVATED_VENDOR' : 'ADMIN_DEACTIVATED_VENDOR',
    'Vendor',
    vendor._id.toString(),
    { shopName: vendor.shopName, previousStatus: vendor.status, newStatus: status }
  );

  res.json({ success: true, data: { vendor } });
});

export const approveVendor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id as string, { status: 'ACTIVE' }, { new: true });
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  await logAction(req.user!._id, 'ADMIN_ACTIVATED_VENDOR', 'Vendor', req.params.id as string, { shopName: vendor.shopName });
  res.json({ success: true, data: { vendor } });
});

export const suspendVendor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await Vendor.findByIdAndUpdate(
    req.params.id as string,
    { status: 'SUSPENDED', availability: 'CLOSED' },
    { new: true }
  );
  if (!vendor) throw createError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  await logAction(req.user!._id, 'ADMIN_DEACTIVATED_VENDOR', 'Vendor', req.params.id as string, { shopName: vendor.shopName, reason: req.body.reason });
  res.json({ success: true, data: { vendor } });
});

export const createVendor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    shopName,
    ownerName,
    phone,
    email,
    address,
    bwPerPage = 1.5,
    colorPerPage = 5.0,
    duplexDiscount = 0,
    openTime = '08:30',
    closeTime = '20:00',
  } = req.body;

  if (!shopName || !ownerName || !phone || !address) {
    throw createError('Shop name, owner name, phone number, and campus location are required', 400, 'FIELDS_REQUIRED');
  }

  // Get Parul University & Campus
  const [university, campus] = await Promise.all([
    University.findOne({ code: 'PU' }) || (await University.findOne()),
    Campus.findOne({ name: { $regex: 'Main Campus', $options: 'i' } }) || (await Campus.findOne()),
  ]);

  if (!university || !campus) {
    throw createError('University or campus configuration missing', 500, 'CONFIG_ERROR');
  }

  const vendorPhone = phone.trim();
  const vendorEmail = email && email.trim() ? email.trim().toLowerCase() : `vendor_${Date.now()}@parul.campusprint.in`;

  // Check if user already exists
  let vendorUser = await User.findOne({ $or: [{ email: vendorEmail }, { phone: vendorPhone }] });
  if (!vendorUser) {
    const saltRounds = 10;
    const defaultPasswordHash = await bcrypt.hash('Vendor@CampusPrint2026!', saltRounds);
    vendorUser = await User.create({
      name: ownerName.trim(),
      email: vendorEmail,
      phone: vendorPhone,
      passwordHash: defaultPasswordHash,
      role: 'VENDOR',
      universityId: university._id,
      campusId: campus._id,
      isActive: true,
    });
  }

  // Check if vendor already exists for this user
  const existingVendor = await Vendor.findOne({ userId: vendorUser._id });
  if (existingVendor) {
    throw createError('A vendor store is already registered for this user/phone', 400, 'VENDOR_EXISTS');
  }

  const vendor = await Vendor.create({
    userId: vendorUser._id,
    shopName: shopName.trim(),
    ownerName: ownerName.trim(),
    phone: vendorPhone,
    address: address.trim(),
    universityId: university._id,
    campusId: campus._id,
    status: 'ACTIVE',
    availability: 'OPEN',
    pricing: {
      bwPerPage: Number(bwPerPage) || 1.5,
      colorPerPage: Number(colorPerPage) || 5.0,
      duplexDiscount: Number(duplexDiscount) || 0,
    },
    operatingHours: {
      open: openTime || '08:30',
      close: closeTime || '20:00',
      days: [1, 2, 3, 4, 5, 6],
    },
    isActive: true,
  });

  await logAction(req.user!._id, 'ADMIN_CREATED_VENDOR', 'Vendor', vendor._id.toString(), {
    shopName: vendor.shopName,
    ownerName: vendor.ownerName,
    status: vendor.status,
    availability: vendor.availability,
  });

  res.status(201).json({
    success: true,
    data: { vendor },
    message: 'Vendor store generated and activated successfully',
  });
});

// ─── 4. Students Management ───────────────────────────────────────────────────

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter: Record<string, unknown> = { role: 'STUDENT' };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { enrollmentNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshToken')
      .populate('universityId', 'name')
      .populate('campusId', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  // Enrich with student profile, order counts and last activity
  const enriched = await Promise.all(
    users.map(async (u) => {
      const [profile, orderCount, lastJob] = await Promise.all([
        StudentProfile.findOne({ userId: u._id }).lean(),
        PrintJob.countDocuments({ studentId: u._id }),
        PrintJob.findOne({ studentId: u._id }).sort({ createdAt: -1 }).select('createdAt').lean(),
      ]);

      return {
        ...u,
        enrollmentNumber: u.enrollmentNumber || profile?.studentId || '',
        department: profile?.department || 'General',
        orderCount,
        lastActivity: lastJob?.createdAt || u.createdAt,
      };
    })
  );

  res.json({ success: true, data: { students: enriched, total } });
});

export const getStudentDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await User.findOne({ _id: req.params.id, role: 'STUDENT' })
    .select('-passwordHash -refreshToken')
    .populate('universityId', 'name')
    .populate('campusId', 'name')
    .lean();

  if (!student) throw createError('Student not found', 404, 'STUDENT_NOT_FOUND');

  const [profile, jobs, totalOrders] = await Promise.all([
    StudentProfile.findOne({ userId: student._id }).lean(),
    PrintJob.find({ studentId: student._id })
      .populate('vendorId', 'shopName')
      .populate('documentId', 'originalName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    PrintJob.countDocuments({ studentId: student._id }),
  ]);

  res.json({
    success: true,
    data: {
      student: {
        ...student,
        enrollmentNumber: student.enrollmentNumber || profile?.studentId || '',
        department: profile?.department,
        year: profile?.year,
        totalOrders,
        jobs,
      },
    },
  });
});

export const deactivateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id as string, { isActive: false }, { new: true });
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND');
  await logAction(req.user!._id, 'DEACTIVATE_USER', 'User', req.params.id as string, { userName: user.name });
  res.json({ success: true, message: 'User deactivated' });
});

// ─── 5. Orders / Print Jobs ───────────────────────────────────────────────────

export const getAdminOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, search, vendorId, page = 1, limit = 20 } = req.query;
  const filter: Record<string, unknown> = {};

  if (status && status !== 'ALL') filter.status = status;
  if (vendorId) filter.vendorId = vendorId;
  if (search) {
    filter.$or = [
      { publicToken: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
      { customerEnrollment: { $regex: search, $options: 'i' } },
    ];
  }

  const [jobs, total] = await Promise.all([
    PrintJob.find(filter)
      .populate('studentId', 'name email phone enrollmentNumber')
      .populate('vendorId', 'shopName address phone')
      .populate('documentId', 'originalName fileSize pageCount')
      .populate('documentIds', 'originalName fileSize pageCount')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    PrintJob.countDocuments(filter),
  ]);

  res.json({ success: true, data: { jobs, total } });
});

export const getAdminOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await PrintJob.findById(req.params.id)
    .populate('studentId', 'name email phone enrollmentNumber')
    .populate('vendorId', 'shopName address phone')
    .populate('documentId', 'originalName fileSize pageCount fileType')
    .populate('documentIds', 'originalName fileSize pageCount fileType')
    .lean();

  if (!job) throw createError('Order not found', 404, 'ORDER_NOT_FOUND');

  res.json({ success: true, data: { job } });
});

// ─── 6. Payments (Architecture Ready) ─────────────────────────────────────────

export const getAdminPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter: Record<string, unknown> = {};
  if (status && status !== 'ALL') filter.status = status;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('studentId', 'name email phone')
      .populate('printJobId', 'publicToken')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Payment.countDocuments(filter),
  ]);

  res.json({ success: true, data: { payments, total } });
});

// ─── 7. Complaints ────────────────────────────────────────────────────────────

export const getComplaints = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter: Record<string, unknown> = {};
  if (status && status !== 'ALL') filter.status = status;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('studentId', 'name email phone enrollmentNumber')
      .populate('vendorId', 'shopName')
      .populate('orderId', 'publicToken')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  res.json({ success: true, data: { complaints, total } });
});

export const updateComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, adminNotes } = req.body;
  const updateData: Record<string, unknown> = {};

  if (status) updateData.status = status;
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  if (status === 'RESOLVED') updateData.resolvedAt = new Date();

  const complaint = await Complaint.findByIdAndUpdate(req.params.id as string, updateData, { new: true });
  if (!complaint) throw createError('Complaint not found', 404, 'COMPLAINT_NOT_FOUND');

  await logAction(req.user!._id, 'UPDATE_COMPLAINT', 'Complaint', req.params.id as string, { status, adminNotes });
  res.json({ success: true, data: { complaint } });
});

// ─── 8. Analytics ─────────────────────────────────────────────────────────────

export const getAdminAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { period = '7d' } = req.query;
  let from = new Date();

  if (period === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (period === '30d') {
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
  }

  const [
    totalJobs,
    printTypeAgg,
    statusAgg,
    pagesAgg,
    vendorPerformance,
    studentStats,
  ] = await Promise.all([
    PrintJob.countDocuments({ createdAt: { $gte: from } }),
    PrintJob.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: '$printConfig.colorMode', count: { $sum: 1 }, pages: { $sum: '$printConfig.totalPages' } } },
    ]),
    PrintJob.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PrintJob.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: null, totalPages: { $sum: '$printConfig.totalPages' } } },
    ]),
    PrintJob.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: '$vendorId',
          totalJobs: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'COLLECTED'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
        },
      },
      { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      { $project: { shopName: '$vendor.shopName', totalJobs: 1, completed: 1, cancelled: 1 } },
    ]),
    PrintJob.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: '$studentId', jobsCount: { $sum: 1 } } },
    ]),
  ]);

  const totalPages = pagesAgg[0]?.totalPages || 0;
  const bwPages = printTypeAgg.find((p) => p._id === 'BW')?.pages || 0;
  const colorPages = printTypeAgg.find((p) => p._id === 'COLOR')?.pages || 0;
  const avgPagesPerOrder = totalJobs > 0 ? (totalPages / totalJobs).toFixed(1) : '0';

  const activeStudents = studentStats.length;
  const repeatUsers = studentStats.filter((s) => s.jobsCount > 1).length;
  const jobsPerStudent = activeStudents > 0 ? (totalJobs / activeStudents).toFixed(1) : '0';

  const feeDoc = await Settings.findOne({ key: { $in: ['platformFee', 'PLATFORM_FEE'] } }).lean();
  const platformFee = feeDoc?.value !== undefined ? Number(feeDoc.value) : 2;

  res.json({
    success: true,
    data: {
      period,
      platformFee,
      printActivity: {
        totalJobs,
        totalPages,
        bwPages,
        colorPages,
        avgPagesPerOrder,
      },
      vendorPerformance,
      studentActivity: {
        activeStudents,
        repeatUsers,
        jobsPerStudent,
      },
      statusDistribution: statusAgg,
      revenue: {
        totalRevenue: 0,
        vendorEarnings: 0,
        platformFees: totalJobs * platformFee,
        note: 'Payments disabled currently',
      },
    },
  });
});

// ─── 9. Audit Logs ────────────────────────────────────────────────────────────

export const getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { search, page = 1, limit = 50 } = req.query;
  const filter: Record<string, unknown> = {};

  if (search) {
    filter.$or = [
      { action: { $regex: search, $options: 'i' } },
      { entityType: { $regex: search, $options: 'i' } },
      { entityId: { $regex: search, $options: 'i' } },
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: { logs, total } });
});

// ─── 10. Settings ─────────────────────────────────────────────────────────────

export const getAdminSettings = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [settingsDocs, university] = await Promise.all([
    Settings.find().lean(),
    University.findOne({ code: 'PU' }) || (await University.findOne()),
  ]);

  const settingsObj: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const s of settingsDocs) {
    settingsObj[s.key] = s.value;
  }

  const platformFee = Number(settingsObj.platformFee ?? settingsObj.PLATFORM_FEE ?? 2);
  const maxFileSizeMb = Number(settingsObj.maxFileSizeMb ?? settingsObj.MAX_UPLOAD_SIZE_MB ?? 25);
  const maxPagesLimit = Number(settingsObj.maxPagesLimit ?? settingsObj.MAX_PAGES ?? 200);
  const orderExpiryHours = Number(settingsObj.orderExpiryHours ?? 48);
  const reprintWindowHours = Number(settingsObj.reprintWindowHours ?? 24);
  const supportEmail = String(settingsObj.supportEmail ?? 'support@campusprint.in');

  const unifiedSettings = {
    ...settingsObj,
    platformFee,
    PLATFORM_FEE: platformFee,
    maxFileSizeMb,
    MAX_UPLOAD_SIZE_MB: maxFileSizeMb,
    maxPagesLimit,
    MAX_PAGES: maxPagesLimit,
    orderExpiryHours,
    reprintWindowHours,
    supportEmail,
  };

  res.json({
    success: true,
    data: {
      settings: unifiedSettings,
      university: {
        name: university?.name || 'Parul University',
        code: university?.code || 'PU',
        location: university?.location || 'Vadodara, Gujarat',
      },
    },
  });
});

export const updateAdminSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updates = req.body;

  const normalizedUpdates: Record<string, unknown> = { ...updates };
  if (updates.platformFee !== undefined) {
    normalizedUpdates.PLATFORM_FEE = Number(updates.platformFee);
    normalizedUpdates.platformFee = Number(updates.platformFee);
  }
  if (updates.maxFileSizeMb !== undefined) {
    normalizedUpdates.MAX_UPLOAD_SIZE_MB = Number(updates.maxFileSizeMb);
    normalizedUpdates.maxFileSizeMb = Number(updates.maxFileSizeMb);
  }
  if (updates.maxPagesLimit !== undefined) {
    normalizedUpdates.MAX_PAGES = Number(updates.maxPagesLimit);
    normalizedUpdates.maxPagesLimit = Number(updates.maxPagesLimit);
  }

  for (const [key, value] of Object.entries(normalizedUpdates)) {
    await Settings.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
  }

  await logAction(req.user!._id, 'ADMIN_UPDATE_SETTINGS', 'Settings', undefined, updates);
  res.json({ success: true, message: 'Settings updated successfully' });
});
