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
exports.Vendor = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const vendorSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    shopName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    universityId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'University', required: true },
    campusId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Campus', required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    logo: { type: String },
    profileImage: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ACTIVE'],
        default: 'PENDING',
    },
    availability: {
        type: String,
        enum: ['OPEN', 'CLOSED', 'UNAVAILABLE'],
        default: 'CLOSED',
    },
    operatingHours: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '21:00' },
        days: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    },
    pricing: {
        bwPerPage: { type: Number, default: 1 },
        colorPerPage: { type: Number, default: 5 },
        duplexDiscount: { type: Number, default: 0 },
    },
    qrCode: { type: String },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    portalPassword: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
vendorSchema.index({ campusId: 1, status: 1 });
vendorSchema.index({ universityId: 1 });
exports.Vendor = mongoose_1.default.model('Vendor', vendorSchema);
//# sourceMappingURL=Vendor.js.map