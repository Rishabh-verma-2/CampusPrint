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

  // ─── Authentication middleware for Socket.IO ──────────────────────────────
  // Runs before every connection. Verifies JWT and attaches user data.
  io.use(async (socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      // Allow unauthenticated connections — they won't join any private rooms
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

  io.on('connection', async (socket: Socket) => {
    const { userId, role } = socket.data;

    if (userId) {
      // Join personal user room (for direct user notifications)
      socket.join(`user:${userId}`);

      if (role === 'STUDENT') {
        // Students join their personal student room
        socket.join(`student:${userId}`);
        console.log(`[Socket] Student connected: ${userId}`);

      } else if (role === 'VENDOR') {
        // CRITICAL FIX: Vendors must join vendor:<Vendor._id> room, NOT vendor:<User._id>
        // The Vendor document _id is different from the User _id.
        // All payment notifications emit to vendor:<Vendor._id>.
        try {
          const { Vendor } = await import('../models/Vendor');
          const vendor = await Vendor.findOne({ userId }).select('_id').lean();
          if (vendor) {
            const vendorRoomId = vendor._id.toString();
            socket.join(`vendor:${vendorRoomId}`);
            socket.data.vendorId = vendorRoomId;
            console.log(`[Socket] Vendor connected: userId=${userId} vendorId=${vendorRoomId}`);
          } else {
            console.warn(`[Socket] Vendor connected but no Vendor document found for userId=${userId}`);
          }
        } catch (err) {
          console.error('[Socket] Error looking up vendor for room assignment:', err);
        }

      } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        socket.join('admin');
        console.log(`[Socket] Admin connected: ${userId}`);
      }
    }

    // ─── REMOVED: socket.on('join:vendor') ──────────────────────────────────
    // This was INSECURE: any socket (including students) could join any vendor
    // room by simply emitting 'join:vendor' with an arbitrary vendorId.
    // Vendor rooms are now assigned exclusively via authenticated JWT lookup above.

    // Student room join (kept for backward compatibility — already handled above)
    socket.on('join:student', (studentId: string) => {
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

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
