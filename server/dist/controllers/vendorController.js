"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorAnalytics = exports.updateVendorProfile = exports.updateVendorAvailability = exports.updateVendorPricing = exports.getVendorQueue = exports.getVendorDashboard = exports.getVendorPricing = exports.getVendorById = exports.getVendors = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const Vendor_1 = require("../models/Vendor");
const PrintJob_1 = require("../models/PrintJob");
// ─── Public: List Vendors ──────────────────────────────────────────────────────
exports.getVendors = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { campusId, universityId } = req.query;
    const filter = {
        status: 'ACTIVE',
        isActive: true,
    };
    if (campusId)
        filter.campusId = campusId;
    if (universityId)
        filter.universityId = universityId;
    const vendors = await Vendor_1.Vendor.find(filter)
        .populate('campusId', 'name')
        .populate('universityId', 'name')
        .select('-userId')
        .lean();
    res.json({ success: true, data: { vendors } });
});
// ─── Public: Single Vendor ─────────────────────────────────────────────────────
exports.getVendorById = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findById(req.params.id)
        .populate('campusId', 'name')
        .populate('universityId', 'name')
        .select('-userId')
        .lean();
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    res.json({ success: true, data: { vendor } });
});
// ─── Public: Vendor Pricing ────────────────────────────────────────────────────
exports.getVendorPricing = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findById(req.params.id).select('pricing').lean();
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    res.json({ success: true, data: { pricing: vendor.pricing } });
});
// ─── Vendor: Dashboard Stats ──────────────────────────────────────────────────
exports.getVendorDashboard = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalToday, pending, printing, ready, completed] = await Promise.all([
        PrintJob_1.PrintJob.countDocuments({ vendorId: vendor._id, createdAt: { $gte: today } }),
        PrintJob_1.PrintJob.countDocuments({ vendorId: vendor._id, status: 'QUEUED' }),
        PrintJob_1.PrintJob.countDocuments({ vendorId: vendor._id, status: { $in: ['ACCEPTED', 'PRINTING'] } }),
        PrintJob_1.PrintJob.countDocuments({ vendorId: vendor._id, status: 'READY' }),
        PrintJob_1.PrintJob.countDocuments({ vendorId: vendor._id, status: 'COLLECTED', createdAt: { $gte: today } }),
    ]);
    // Today's revenue
    const revenueAgg = await PrintJob_1.PrintJob.aggregate([
        {
            $match: {
                vendorId: vendor._id,
                status: { $in: ['COLLECTED', 'READY'] },
                createdAt: { $gte: today },
            },
        },
        { $group: { _id: null, total: { $sum: '$pricing.vendorAmount' } } },
    ]);
    const todayRevenue = revenueAgg[0]?.total || 0;
    res.json({
        success: true,
        data: {
            vendor: {
                _id: vendor._id,
                shopName: vendor.shopName,
                availability: vendor.availability,
                status: vendor.status,
            },
            stats: { totalToday, pending, printing, ready, completed, todayRevenue },
        },
    });
});
// ─── Vendor: Get Queue ────────────────────────────────────────────────────────
exports.getVendorQueue = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const { status, page = 1, limit = 20, sort = 'oldest' } = req.query;
    const filter = { vendorId: vendor._id };
    if (status && status !== 'all') {
        if (status === 'new')
            filter.status = 'QUEUED';
        else
            filter.status = status.toUpperCase();
    }
    else {
        filter.status = { $in: ['QUEUED', 'ACCEPTED', 'PRINTING', 'READY'] };
    }
    const sortDir = sort === 'newest' ? -1 : 1;
    const jobs = await PrintJob_1.PrintJob.find(filter)
        .populate('studentId', 'name phone enrollmentNumber')
        .populate('documentId', 'originalName pageCount fileSize')
        .sort({ createdAt: sortDir })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean();
    const total = await PrintJob_1.PrintJob.countDocuments(filter);
    res.json({ success: true, data: { jobs, total } });
});
// ─── Vendor: Update Pricing ────────────────────────────────────────────────────
exports.updateVendorPricing = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
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
exports.updateVendorAvailability = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    vendor.availability = req.body.availability;
    await vendor.save();
    res.json({ success: true, data: { availability: vendor.availability } });
});
// ─── Vendor: Update Profile ────────────────────────────────────────────────────
exports.updateVendorProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const allowed = ['shopName', 'ownerName', 'phone', 'address', 'operatingHours'];
    for (const key of allowed) {
        if (req.body[key] !== undefined) {
            vendor[key] = req.body[key];
        }
    }
    await vendor.save();
    res.json({ success: true, data: { vendor } });
});
// ─── Vendor: Analytics ────────────────────────────────────────────────────────
exports.getVendorAnalytics = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const vendor = await Vendor_1.Vendor.findOne({ userId: req.user._id });
    if (!vendor)
        throw (0, errorHandler_1.createError)('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    const [revenueByDay, printTypeAgg] = await Promise.all([
        PrintJob_1.PrintJob.aggregate([
            {
                $match: {
                    vendorId: vendor._id,
                    status: { $in: ['COLLECTED', 'READY'] },
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
        PrintJob_1.PrintJob.aggregate([
            { $match: { vendorId: vendor._id, createdAt: { $gte: from } } },
            { $group: { _id: '$printConfig.colorMode', count: { $sum: 1 } } },
        ]),
    ]);
    res.json({
        success: true,
        data: { revenueByDay, printTypeDistribution: printTypeAgg, period },
    });
});
//# sourceMappingURL=vendorController.js.map