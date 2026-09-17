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
exports.Complaint = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const complaintSchema = new mongoose_1.Schema({
    ticketId: { type: String, required: true, unique: true },
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PrintJob', required: true },
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    category: {
        type: String,
        enum: ['WRONG_PRINT', 'MISSING_PAGES', 'POOR_QUALITY', 'VENDOR_ISSUE', 'PAYMENT_ISSUE', 'OTHER'],
        required: true,
    },
    description: { type: String, required: true },
    attachments: [{ type: String }],
    status: {
        type: String,
        enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'],
        default: 'OPEN',
    },
    adminNotes: { type: String },
    resolvedAt: { type: Date },
}, { timestamps: true });
complaintSchema.index({ studentId: 1 });
complaintSchema.index({ vendorId: 1 });
complaintSchema.index({ orderId: 1 });
complaintSchema.index({ status: 1 });
exports.Complaint = mongoose_1.default.model('Complaint', complaintSchema);
//# sourceMappingURL=Complaint.js.map