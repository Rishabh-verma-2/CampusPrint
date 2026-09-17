"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminSettings = exports.getAdminSettings = exports.getAuditLogs = exports.getAdminAnalytics = exports.updateComplaint = exports.getComplaints = exports.getAdminPayments = exports.getAdminOrderById = exports.getAdminOrders = exports.deactivateUser = exports.getStudentDetails = exports.getUsers = exports.suspendVendor = exports.approveVendor = exports.updateVendorStatus = exports.getAdminVendors = exports.createCampus = exports.getCampuses = exports.createUniversity = exports.getUniversityById = exports.getUniversities = exports.getAdminDashboard = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const User_1 = require("../models/User");
const Vendor_1 = require("../models/Vendor");
const PrintJob_1 = require("../models/PrintJob");
const Payment_1 = require("../models/Payment");
const University_1 = require("../models/University");
const Campus_1 = require("../models/Campus");
const AuditLog_1 = require("../models/AuditLog");
const Complaint_1 = require("../models/Complaint");
const Settings_1 = require("../models/Settings");
const StudentProfile_1 = require("../models/StudentProfile");
const logAction = async (actorId, action, entityType, entityId, metadata) => {
    try {
        await AuditLog_1.AuditLog.create({ actorId, action, entityType, entityId, metadata });
    }
    catch (err) {
        // Non-blocking
    }
};
// ─── 1. Admin Dashboard ───────────────────────────────────────────────────────
exports.getAdminDashboard = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // 1. Parul University context
    const university = await University_1.University.findOne({ code: 'PU' }) || await University_1.University.findOne();
    // 2. 8 Real-time KPI Stats
    const [totalStudents, activeVendors, todayJobs, pendingJobs, completedJobs, cancelledJobs,] = await Promise.all([
        User_1.User.countDocuments({ role: 'STUDENT', isActive: true }),
        Vendor_1.Vendor.countDocuments({ status: 'ACTIVE' }),
        PrintJob_1.PrintJob.countDocuments({ createdAt: { $gte: today } }),
        PrintJob_1.PrintJob.countDocuments({ status: { $in: ['QUEUED', 'ACCEPTED', 'PRINTING'] } }),
        PrintJob_1.PrintJob.countDocuments({ status: 'COLLECTED', createdAt: { $gte: today } }),
        PrintJob_1.PrintJob.countDocuments({ status: 'CANCELLED', createdAt: { $gte: today } }),
    ]);
    // Real-time Revenue calculation (only successful collected/paid jobs)
    const revenueAgg = await PrintJob_1.PrintJob.aggregate([
        { $match: { status: 'COLLECTED', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' }, platform: { $sum: '$pricing.platformFee' } } },
    ]);
    const todayRevenue = revenueAgg[0]?.total || 0;
    const todayPlatformFee = revenueAgg[0]?.platform || 0;
    // 3. Last 7 Days Orders & Revenue Trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const rawDaily = await PrintJob_1.PrintJob.aggregate([
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
    const rawStatus = await PrintJob_1.PrintJob.aggregate([
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
    const recentOrders = await PrintJob_1.PrintJob.find()
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
exports.getUniversities = (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const universities = await University_1.University.find().lean();
    // Attach real metrics for each university
    const enriched = await Promise.all(universities.map(async (uni) => {
        const [studentCount, vendorCount, orderCount] = await Promise.all([
            User_1.User.countDocuments({ role: 'STUDENT', universityId: uni._id }),
            Vendor_1.Vendor.countDocuments({ universityId: uni._id }),
            PrintJob_1.PrintJob.countDocuments({ universityId: uni._id }),
        ]);
        return {
            ...uni,
            studentCount,
            vendorCount,
            orderCount,
        };
    }));
    res.json({ success: true, data: { universities: enriched } });
});
exports.getUniversityById = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const university = await University_1.University.findById(req.params.id).lean();
    if (!university)
        throw (0, errorHandler_1.createError)('University not found', 404, 'UNIVERSITY_NOT_FOUND');
    const campuses = await Campus_1.Campus.find({ universityId: university._id }).lean();
    const [studentCount, vendorCount, orderCount] = await Promise.all([
        User_1.User.countDocuments({ role: 'STUDENT', universityId: university._id }),
        Vendor_1.Vendor.countDocuments({ universityId: university._id }),
        PrintJob_1.PrintJob.countDocuments({ universityId: university._id }),
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
exports.createUniversity = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const university = await University_1.University.create(req.body);
    await logAction(req.user._id, 'CREATE_UNIVERSITY', 'University', university._id.toString(), req.body);
    res.status(201).json({ success: true, data: { university } });
});
exports.getCampuses = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { universityId } = req.query;
    const filter = {};
    if (universityId)
        filter.universityId = universityId;
    const campuses = await Campus_1.Campus.find(filter).populate('universityId', 'name').lean();
    res.json({ success: true, data: { campuses } });
});
exports.createCampus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const campus = await Campus_1.Campus.create(req.body);
    await logAction(req.user._id, 'CREATE_CAMPUS', 'Campus', campus._id.toString(), req.body);
    res.status(201).json({ success: true, data: { campus } });
});
// ─── 3. Vendors Management ────────────────────────────────────────────────────
exports.getAdminVendors = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'ALL')
        filter.status = status;
    if (search) {
        filter.$or = [
            { shopName: { $regex: search, $options: 'i' } },
            { ownerName: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
        ];
    }
    const [vendors, total] = await Promise.all([
        Vendor_1.Vendor.find(filter)
            .populate('userId', 'name email phone')
            .populate('campusId', 'name')
            .populate('universityId', 'name')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean(),
        Vendor_1.Vendor.countDocuments(filter),
    ]);
    // Enrich with live orders and revenue counts
    const enriched = await Promise.all(vendors.map(async (v) => {
        const [orderCount, revenueAgg] = await Promise.all([
            PrintJob_1.PrintJob.countDocuments({ vendorId: v._id }),
            PrintJob_1.PrintJob.aggregate([
                { $match: { vendorId: v._id, status: 'COLLECTED' } },
                { $group: { _id: null, total: { $sum: '$pricing.vendorAmount' } } },
            ]),
        ]);
        return {
            ...v,
            ordersCount: orderCount,
            revenue: revenueAgg[0]?.total || 0,
        };
    }));
    res.json({ success: true, data: { vendors: enriched, total } });
});
exports.updateVendorStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status } = req.body;
    const vendorId = req.params.id;
    if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
        throw (0, errorHandler_1.createError)('Invalid vendor status', 400, 'INVALID_STATUS');
    }
    const updateFields = { status };
    if (status === 'SUSPENDED') {
        updateFields.availability = 'CLOSED';
    }
    const vendor = await Vendor_1.Vendor.findByIdAndUpdate(vendorId, updateFields, { new: true });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    await logAction(req.user._id, status === 'ACTIVE' ? 'ADMIN_ACTIVATED_VENDOR' : 'ADMIN_DEACTIVATED_VENDOR', 'Vendor', vendor._id.toString(), { shopName: vendor.shopName, previousStatus: vendor.status, newStatus: status });
    res.json({ success: true, data: { vendor } });
});
exports.approveVendor = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findByIdAndUpdate(req.params.id, { status: 'ACTIVE' }, { new: true });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    await logAction(req.user._id, 'ADMIN_ACTIVATED_VENDOR', 'Vendor', req.params.id, { shopName: vendor.shopName });
    res.json({ success: true, data: { vendor } });
});
exports.suspendVendor = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findByIdAndUpdate(req.params.id, { status: 'SUSPENDED', availability: 'CLOSED' }, { new: true });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    await logAction(req.user._id, 'ADMIN_DEACTIVATED_VENDOR', 'Vendor', req.params.id, { shopName: vendor.shopName, reason: req.body.reason });
    res.json({ success: true, data: { vendor } });
});
// ─── 4. Students Management ───────────────────────────────────────────────────
exports.getUsers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { role: 'STUDENT' };
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { enrollmentNumber: { $regex: search, $options: 'i' } },
        ];
    }
    const [users, total] = await Promise.all([
        User_1.User.find(filter)
            .select('-passwordHash -refreshToken')
            .populate('universityId', 'name')
            .populate('campusId', 'name')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean(),
        User_1.User.countDocuments(filter),
    ]);
    // Enrich with student profile, order counts and last activity
    const enriched = await Promise.all(users.map(async (u) => {
        const [profile, orderCount, lastJob] = await Promise.all([
            StudentProfile_1.StudentProfile.findOne({ userId: u._id }).lean(),
            PrintJob_1.PrintJob.countDocuments({ studentId: u._id }),
            PrintJob_1.PrintJob.findOne({ studentId: u._id }).sort({ createdAt: -1 }).select('createdAt').lean(),
        ]);
        return {
            ...u,
            enrollmentNumber: u.enrollmentNumber || profile?.studentId || '',
            department: profile?.department || 'General',
            orderCount,
            lastActivity: lastJob?.createdAt || u.createdAt,
        };
    }));
    res.json({ success: true, data: { students: enriched, total } });
});
exports.getStudentDetails = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const student = await User_1.User.findOne({ _id: req.params.id, role: 'STUDENT' })
        .select('-passwordHash -refreshToken')
        .populate('universityId', 'name')
        .populate('campusId', 'name')
        .lean();
    if (!student)
        throw (0, errorHandler_1.createError)('Student not found', 404, 'STUDENT_NOT_FOUND');
    const [profile, jobs, totalOrders] = await Promise.all([
        StudentProfile_1.StudentProfile.findOne({ userId: student._id }).lean(),
        PrintJob_1.PrintJob.find({ studentId: student._id })
            .populate('vendorId', 'shopName')
            .populate('documentId', 'originalName')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
        PrintJob_1.PrintJob.countDocuments({ studentId: student._id }),
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
exports.deactivateUser = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user)
        throw (0, errorHandler_1.createError)('User not found', 404, 'USER_NOT_FOUND');
    await logAction(req.user._id, 'DEACTIVATE_USER', 'User', req.params.id, { userName: user.name });
    res.json({ success: true, message: 'User deactivated' });
});
// ─── 5. Orders / Print Jobs ───────────────────────────────────────────────────
exports.getAdminOrders = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, search, vendorId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'ALL')
        filter.status = status;
    if (vendorId)
        filter.vendorId = vendorId;
    if (search) {
        filter.$or = [
            { publicToken: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { customerPhone: { $regex: search, $options: 'i' } },
            { customerEnrollment: { $regex: search, $options: 'i' } },
        ];
    }
    const [jobs, total] = await Promise.all([
        PrintJob_1.PrintJob.find(filter)
            .populate('studentId', 'name email phone enrollmentNumber')
            .populate('vendorId', 'shopName address phone')
            .populate('documentId', 'originalName fileSize pageCount')
            .populate('documentIds', 'originalName fileSize pageCount')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean(),
        PrintJob_1.PrintJob.countDocuments(filter),
    ]);
    res.json({ success: true, data: { jobs, total } });
});
exports.getAdminOrderById = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const job = await PrintJob_1.PrintJob.findById(req.params.id)
        .populate('studentId', 'name email phone enrollmentNumber')
        .populate('vendorId', 'shopName address phone')
        .populate('documentId', 'originalName fileSize pageCount fileType')
        .populate('documentIds', 'originalName fileSize pageCount fileType')
        .lean();
    if (!job)
        throw (0, errorHandler_1.createError)('Order not found', 404, 'ORDER_NOT_FOUND');
    res.json({ success: true, data: { job } });
});
// ─── 6. Payments (Architecture Ready) ─────────────────────────────────────────
exports.getAdminPayments = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'ALL')
        filter.status = status;
    const [payments, total] = await Promise.all([
        Payment_1.Payment.find(filter)
            .populate('studentId', 'name email phone')
            .populate('printJobId', 'publicToken')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean(),
        Payment_1.Payment.countDocuments(filter),
    ]);
    res.json({ success: true, data: { payments, total } });
});
// ─── 7. Complaints ────────────────────────────────────────────────────────────
exports.getComplaints = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'ALL')
        filter.status = status;
    const [complaints, total] = await Promise.all([
        Complaint_1.Complaint.find(filter)
            .populate('studentId', 'name email phone enrollmentNumber')
            .populate('vendorId', 'shopName')
            .populate('orderId', 'publicToken')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean(),
        Complaint_1.Complaint.countDocuments(filter),
    ]);
    res.json({ success: true, data: { complaints, total } });
});
exports.updateComplaint = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, adminNotes } = req.body;
    const updateData = {};
    if (status)
        updateData.status = status;
    if (adminNotes !== undefined)
        updateData.adminNotes = adminNotes;
    if (status === 'RESOLVED')
        updateData.resolvedAt = new Date();
    const complaint = await Complaint_1.Complaint.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!complaint)
        throw (0, errorHandler_1.createError)('Complaint not found', 404, 'COMPLAINT_NOT_FOUND');
    await logAction(req.user._id, 'UPDATE_COMPLAINT', 'Complaint', req.params.id, { status, adminNotes });
    res.json({ success: true, data: { complaint } });
});
// ─── 8. Analytics ─────────────────────────────────────────────────────────────
exports.getAdminAnalytics = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { period = '7d' } = req.query;
    let from = new Date();
    if (period === 'today') {
        from.setHours(0, 0, 0, 0);
    }
    else if (period === '30d') {
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
    }
    else {
        from.setDate(from.getDate() - 7);
        from.setHours(0, 0, 0, 0);
    }
    const [totalJobs, printTypeAgg, statusAgg, pagesAgg, vendorPerformance, studentStats,] = await Promise.all([
        PrintJob_1.PrintJob.countDocuments({ createdAt: { $gte: from } }),
        PrintJob_1.PrintJob.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: { _id: '$printConfig.colorMode', count: { $sum: 1 }, pages: { $sum: '$printConfig.totalPages' } } },
        ]),
        PrintJob_1.PrintJob.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        PrintJob_1.PrintJob.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: { _id: null, totalPages: { $sum: '$printConfig.totalPages' } } },
        ]),
        PrintJob_1.PrintJob.aggregate([
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
        PrintJob_1.PrintJob.aggregate([
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
    res.json({
        success: true,
        data: {
            period,
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
                platformFees: 0,
                note: 'Payments disabled currently',
            },
        },
    });
});
// ─── 9. Audit Logs ────────────────────────────────────────────────────────────
exports.getAuditLogs = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (search) {
        filter.$or = [
            { action: { $regex: search, $options: 'i' } },
            { entityType: { $regex: search, $options: 'i' } },
            { entityId: { $regex: search, $options: 'i' } },
        ];
    }
    const [logs, total] = await Promise.all([
        AuditLog_1.AuditLog.find(filter)
            .populate('actorId', 'name email role')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean(),
        AuditLog_1.AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: { logs, total } });
});
// ─── 10. Settings ─────────────────────────────────────────────────────────────
exports.getAdminSettings = (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const [settingsDocs, university] = await Promise.all([
        Settings_1.Settings.find().lean(),
        University_1.University.findOne({ code: 'PU' }) || await University_1.University.findOne(),
    ]);
    const settingsObj = { ...Settings_1.DEFAULT_SETTINGS };
    for (const s of settingsDocs) {
        settingsObj[s.key] = s.value;
    }
    res.json({
        success: true,
        data: {
            settings: settingsObj,
            university: {
                name: university?.name || 'Parul University',
                code: university?.code || 'PU',
                location: university?.location || 'Vadodara, Gujarat',
            },
        },
    });
});
exports.updateAdminSettings = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
        await Settings_1.Settings.findOneAndUpdate({ key }, { key, value }, { upsert: true, new: true });
    }
    await logAction(req.user._id, 'ADMIN_UPDATE_SETTINGS', 'Settings', undefined, updates);
    res.json({ success: true, message: 'Settings updated successfully' });
});
//# sourceMappingURL=adminController.js.map