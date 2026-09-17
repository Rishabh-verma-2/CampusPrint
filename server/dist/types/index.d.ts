export type UserRole = 'STUDENT' | 'VENDOR' | 'ADMIN' | 'SUPER_ADMIN';
export type PrintJobStatus = 'PAYMENT_PENDING' | 'PAID' | 'QUEUED' | 'ACCEPTED' | 'PRINTING' | 'READY' | 'COLLECTED' | 'CANCELLED' | 'FAILED' | 'REFUNDED';
export type ColorMode = 'BW' | 'COLOR';
export type SidesMode = 'SINGLE' | 'DOUBLE';
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE';
export type VendorAvailability = 'OPEN' | 'CLOSED' | 'UNAVAILABLE';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type ComplaintCategory = 'WRONG_PRINT' | 'MISSING_PAGES' | 'POOR_QUALITY' | 'VENDOR_ISSUE' | 'PAYMENT_ISSUE' | 'OTHER';
export interface PrintConfig {
    colorMode: ColorMode;
    sides: SidesMode;
    copies: number;
    pageRanges: string;
    totalPages: number;
}
export interface PriceSnapshot {
    bwPerPage: number;
    colorPerPage: number;
    duplexDiscount: number;
}
export interface PriceBreakdown {
    subtotal: number;
    platformFee: number;
    tax: number;
    total: number;
    vendorAmount: number;
}
export interface OperatingHours {
    open: string;
    close: string;
    days: number[];
}
export interface VendorPricing {
    bwPerPage: number;
    colorPerPage: number;
    duplexDiscount: number;
}
//# sourceMappingURL=index.d.ts.map