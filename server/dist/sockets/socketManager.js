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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
let io;
const isAllowedOrigin = (origin) => {
    if (!origin)
        return true;
    const configured = [
        ...env_1.env.CLIENT_URL.split(','),
        ...env_1.env.FRONTEND_URL.split(','),
        ...env_1.env.SOCKET_CORS_ORIGIN.split(','),
    ]
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean);
    if (configured.includes('*') || configured.includes(origin))
        return true;
    if (/^https:\/\/.*\.vercel\.app$/.test(origin))
        return true;
    if (origin === 'http://localhost:5173' || origin === 'http://localhost:3000')
        return true;
    return false;
};
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (isAllowedOrigin(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error(`Origin ${origin} not allowed by CORS`));
                }
            },
            credentials: true,
        },
    });
    // ─── Authentication middleware for Socket.IO ──────────────────────────────
    // Runs before every connection. Verifies JWT and attaches user data.
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token ||
            socket.handshake.query?.token;
        if (!token) {
            // Allow unauthenticated connections — they won't join any private rooms
            return next();
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            socket.data.userId = decoded._id;
            socket.data.role = decoded.role;
            next();
        }
        catch {
            next(new Error('Authentication error'));
        }
    });
    io.on('connection', async (socket) => {
        const { userId, role } = socket.data;
        if (userId) {
            // Join personal user room (for direct user notifications)
            socket.join(`user:${userId}`);
            if (role === 'STUDENT') {
                // Students join their personal student room
                socket.join(`student:${userId}`);
                console.log(`[Socket] Student connected: ${userId}`);
            }
            else if (role === 'VENDOR') {
                // CRITICAL FIX: Vendors must join vendor:<Vendor._id> room, NOT vendor:<User._id>
                // The Vendor document _id is different from the User _id.
                // All payment notifications emit to vendor:<Vendor._id>.
                try {
                    const { Vendor } = await Promise.resolve().then(() => __importStar(require('../models/Vendor')));
                    const vendor = await Vendor.findOne({ userId }).select('_id').lean();
                    if (vendor) {
                        const vendorRoomId = vendor._id.toString();
                        socket.join(`vendor:${vendorRoomId}`);
                        socket.data.vendorId = vendorRoomId;
                        console.log(`[Socket] Vendor connected: userId=${userId} vendorId=${vendorRoomId}`);
                    }
                    else {
                        console.warn(`[Socket] Vendor connected but no Vendor document found for userId=${userId}`);
                    }
                }
                catch (err) {
                    console.error('[Socket] Error looking up vendor for room assignment:', err);
                }
            }
            else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
                socket.join('admin');
                console.log(`[Socket] Admin connected: ${userId}`);
            }
        }
        // ─── REMOVED: socket.on('join:vendor') ──────────────────────────────────
        // This was INSECURE: any socket (including students) could join any vendor
        // room by simply emitting 'join:vendor' with an arbitrary vendorId.
        // Vendor rooms are now assigned exclusively via authenticated JWT lookup above.
        // Student room join (kept for backward compatibility — already handled above)
        socket.on('join:student', (studentId) => {
            // Only allow if the authenticated user matches
            if (socket.data.userId === studentId && socket.data.role === 'STUDENT') {
                socket.join(`student:${studentId}`);
            }
        });
        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Disconnected: userId=${userId ?? 'unauthenticated'} reason=${reason}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error('Socket.IO not initialized');
    return io;
};
exports.getIO = getIO;
//# sourceMappingURL=socketManager.js.map