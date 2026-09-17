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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintJob = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const printJobSchema = new mongoose_1.Schema({
    publicToken: { type: String, required: true, unique: true },
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true, trim: true },
    customerIdentifier: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    customerEnrollment: { type: String, trim: true },
    vendorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    universityId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'University', required: true },
    campusId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Campus', required: true },
    documentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Document', required: true },
    documentIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Document' }],
    status: {
        type: String,
        enum: [
            'PAYMENT_PENDING',
            'PAID',
            'QUEUED',
            'ACCEPTED',
            'PRINTING',
            'READY',
            'COLLECTED',
            'CANCELLED',
            'FAILED',
            'REFUNDED',
        ],
        default: 'PAYMENT_PENDING',
    },
    printConfig: {
        colorMode: { type: String, enum: ['BW', 'COLOR'], required: true },
        sides: { type: String, enum: ['SINGLE', 'DOUBLE'], required: true },
        copies: { type: Number, required: true, min: 1 },
        pageRanges: { type: String, required: true, default: 'all' },
        totalPages: { type: Number, required: true },
    },
    priceSnapshot: {
        bwPerPage: { type: Number, required: true },
        colorPerPage: { type: Number, required: true },
        duplexDiscount: { type: Number, default: 0 },
    },
    pricing: {
        subtotal: { type: Number, required: true },
        platformFee: { type: Number, required: true },
        tax: { type: Number, default: 0 },
        total: { type: Number, required: true },
        vendorAmount: { type: Number, required: true },
    },
    paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment' },
    acceptedAt: { type: Date },
    printingStartedAt: { type: Date },
    readyAt: { type: Date },
    collectedAt: { type: Date },
    cancelledAt: { type: Date },
    failedAt: { type: Date },
    problemNote: { type: String },
    cancellationReason: { type: String },
}, { timestamps: true });
// Indexes for high-frequency queries
printJobSchema.index({ vendorId: 1, status: 1 });
printJobSchema.index({ studentId: 1, createdAt: -1 });
printJobSchema.index({ campusId: 1, createdAt: -1 });
printJobSchema.index({ universityId: 1, createdAt: -1 });
printJobSchema.index({ paymentId: 1 });
printJobSchema.index({ createdAt: -1 });
exports.PrintJob = mongoose_1.default.model('PrintJob', printJobSchema);
//# sourceMappingURL=PrintJob.js.map