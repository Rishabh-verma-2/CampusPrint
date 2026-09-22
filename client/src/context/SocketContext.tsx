import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // FIX: Use useState instead of useRef so that consumer components re-render
  // when the socket connects/disconnects. useRef mutations do NOT trigger re-renders,
  // meaning consumers would always see null even after the socket connected.
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Connect to the Socket.IO server.
    // The server reads the JWT from the cookie for authentication.
    // We also pass userId + role so the server can assign the correct private rooms.
    const backendUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') : '') ||
      (import.meta.env.PROD ? 'https://campusprint-3agy.onrender.com' : '/');

    const newSocket = io(backendUrl, {
      withCredentials: true,
      auth: { userId: user._id, role: user.role },
      transports: ['websocket', 'polling'],
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // When the socket connects (initial connection OR after reconnect),
    // update state so all consumers get the live socket instance.
    newSocket.on('connect', () => {
      setSocket(newSocket);
      setIsConnected(true);
      console.log('[Socket] Connected:', newSocket.id, '| Role:', user.role);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[Socket] Disconnected:', reason);
      // NOTE: We keep the socket reference so Socket.IO can auto-reconnect.
      // Do NOT call setSocket(null) here — it prevents reconnection from working.
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Set the socket immediately so it's available even before 'connect' fires
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
