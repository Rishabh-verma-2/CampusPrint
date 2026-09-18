import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { UserRole } from '../types';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: UserRole;
    email?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '') ||
      (req.query?.token as string | undefined);

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required', code: 'NO_TOKEN' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      _id: string;
      role: UserRole;
      email?: string;
    };

    // Verify user still exists and is active
    const user = await User.findById(decoded._id).select('_id role email isActive');
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or deactivated', code: 'USER_INACTIVE' });
      return;
    }

    req.user = { _id: user._id.toString(), role: user.role, email: user.email };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid token', code: 'INVALID_TOKEN' });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
};

export const requireStudent = requireRole('STUDENT');
export const requireVendor = requireRole('VENDOR');
export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');
export const requireSuperAdmin = requireRole('SUPER_ADMIN');
