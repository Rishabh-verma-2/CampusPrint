"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireAdmin = exports.requireVendor = exports.requireStudent = exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = require("../models/User");
const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken ||
            req.headers.authorization?.replace('Bearer ', '') ||
            req.query?.token;
        if (!token) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'NO_TOKEN' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        // Verify user still exists and is active
        const user = await User_1.User.findById(decoded._id).select('_id role email isActive');
        if (!user || !user.isActive) {
            res.status(401).json({ success: false, message: 'User not found or deactivated', code: 'USER_INACTIVE' });
            return;
        }
        req.user = { _id: user._id.toString(), role: user.role, email: user.email };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
            return;
        }
        res.status(401).json({ success: false, message: 'Invalid token', code: 'INVALID_TOKEN' });
    }
};
exports.authenticate = authenticate;
const requireRole = (...roles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
exports.requireStudent = (0, exports.requireRole)('STUDENT');
exports.requireVendor = (0, exports.requireRole)('VENDOR');
exports.requireAdmin = (0, exports.requireRole)('ADMIN', 'SUPER_ADMIN');
exports.requireSuperAdmin = (0, exports.requireRole)('SUPER_ADMIN');
//# sourceMappingURL=authenticate.js.map