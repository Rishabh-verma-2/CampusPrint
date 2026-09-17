import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../../context/SocketContext';
import apiClient from '../../api/apiClient';
import type { Notification } from '../../types';
import { useNavigate } from 'react-router-dom';

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get<{ data: { notifications: Notification[] } }>('/notifications').then(r => r.data.data?.notifications ?? []),
    refetchInterval: 30000,
  });

  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch('/notifications/mark-all-read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;
    socket.on('notification:new', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => { socket.off('notification:new'); };
  }, [socket, qc]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative flex items-center justify-center"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        id="notification-bell"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="font-bold text-sm text-slate-900">Notifications</span>
            {unread > 0 && (
              <button
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <div
                  key={n._id}
                  className={`p-3 text-left cursor-pointer transition-colors hover:bg-slate-50 ${
                    n.read ? 'bg-white' : 'bg-blue-50/40'
                  }`}
                  onClick={() => {
                    setOpen(false);
                    if ((n.metadata as Record<string, unknown>)?.jobId) {
                      navigate(`/student/orders/${(n.metadata as Record<string, unknown>).jobId}`);
                    }
                  }}
                >
                  <div className="font-semibold text-xs text-slate-900 mb-0.5">{n.title}</div>
                  <div className="text-xs text-slate-600 leading-relaxed">{n.message}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
