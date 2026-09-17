"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: env_1.env.SOCKET_CORS_ORIGIN.split(',').map((s) => s.trim()),
            credentials: true,
        },
    });
    // Authentication middleware for Socket.IO
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token ||
            socket.handshake.query?.token;
        if (!token) {
            // Allow unauthenticated connections to public rooms (e.g. vendor QR scan)
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
    io.on('connection', (socket) => {
        const { userId, role } = socket.data;
        if (userId) {
            // Join personal room for targeted events
            if (role === 'STUDENT') {
                socket.join(`student:${userId}`);
            }
            else if (role === 'VENDOR') {
                socket.join(`vendor:${userId}`);
            }
            else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
                socket.join('admin');
            }
        }
        socket.on('join:vendor', (vendorId) => {
            socket.join(`vendor:${vendorId}`);
        });
        socket.on('join:student', (studentId) => {
            socket.join(`student:${studentId}`);
        });
        socket.on('disconnect', () => {
            // Auto-cleanup
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