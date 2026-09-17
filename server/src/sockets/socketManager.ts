import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let io: Server;

export const initSocket = (server: import('http').Server): Server => {
  io = new Server(server, {
    cors: {
      origin: env.SOCKET_CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      // Allow unauthenticated connections to public rooms (e.g. vendor QR scan)
      return next();
    }

    try {
      const decoded = jwt.verify(token as string, env.JWT_SECRET) as {
        _id: string;
        role: string;
      };
      socket.data.userId = decoded._id;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, role } = socket.data;

    if (userId) {
      // Join personal room for targeted events
      if (role === 'STUDENT') {
        socket.join(`student:${userId}`);
      } else if (role === 'VENDOR') {
        socket.join(`vendor:${userId}`);
      } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        socket.join('admin');
      }
    }

    socket.on('join:vendor', (vendorId: string) => {
      socket.join(`vendor:${vendorId}`);
    });

    socket.on('join:student', (studentId: string) => {
      socket.join(`student:${studentId}`);
    });

    socket.on('disconnect', () => {
      // Auto-cleanup
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
