// Shared frontend TypeScript types matching backend

export type UserRole = 'STUDENT' | 'VENDOR' | 'ADMIN' | 'SUPER_ADMIN';
export type ColorMode = 'BW' | 'COLOR';
export type SidesMode = 'SINGLE' | 'DOUBLE';

export type PrintJobStatus =
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'QUEUED'
  | 'ACCEPTED'
  | 'PRINTING'
  | 'READY'
  | 'COLLECTED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'USER_DROPPED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE';
export type VendorAvailability = 'OPEN' | 'CLOSED' | 'UNAVAILABLE';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  enrollmentNumber?: string;
  role: UserRole;
  universityId?: string;
  campusId?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Vendor {
  _id: string;
  shopName: string;
  ownerName: string;
  universityId: string | { _id: string; name: string };
  campusId: string | { _id: string; name: string };
  address: string;
  phone: string;
  logo?: string;
  status: VendorStatus;
  availability: VendorAvailability;
  operatingHours: { open: string; close: string; days: number[] };
  pricing: { bwPerPage: number; colorPerPage: number; duplexDiscount: number };
  rating: number;
  totalRatings: number;
}

export interface DocumentFile {
  _id: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  fileType: string;
  url?: string;
  createdAt: string;
}

export interface PrintConfig {
  colorMode: ColorMode;
  sides: SidesMode;
  copies: number;
  pageRanges: string;
  totalPages: number;
}

export interface PriceBreakdown {
  subtotal: number;
  platformFee: number;
  tax: number;
  total: number;
  vendorAmount: number;
}

export interface PrintJob {
  _id: string;
  publicToken: string;
  studentId: string | User;
  customerName?: string;
  customerIdentifier?: string;
  customerPhone?: string;
  customerEnrollment?: string;
  vendorId: string | Vendor;
  documentId: string | DocumentFile;
  documentIds?: (string | DocumentFile)[];
  status: PrintJobStatus;
  printConfig: PrintConfig;
  pricing: PriceBreakdown;
  priceSnapshot: { bwPerPage: number; colorPerPage: number; duplexDiscount: number };
  paymentId?: string;
  acceptedAt?: string;
  printingStartedAt?: string;
  readyAt?: string;
  collectedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  printJobId: string;
  studentId: string;
  gateway: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface University {
  _id: string;
  name: string;
  code: string;
  logo?: string;
  location?: string;
  isActive: boolean;
}

export interface Campus {
  _id: string;
  universityId: string | University;
  name: string;
  address?: string;
  isActive: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
