import { Request, Response } from 'express';
export declare const createPaymentOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPaymentStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const handlePaymentWebhook: (req: Request, res: Response) => Promise<void>;
export declare const getPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPaymentByJob: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=paymentController.d.ts.map