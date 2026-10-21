import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { notificationApi } from '../../services/api';
import type { Notification } from '../../types';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const list = await notificationApi.getNotifications(user.id);
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 4000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationApi.markAsRead(id);
    await fetchNotifs();
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllAsRead(user.id);
    await fetchNotifs();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                No notifications right now.
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 hover:bg-slate-50 transition text-left flex flex-col gap-1 ${
                    !n.isRead ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-900">{n.title}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{n.message}</p>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/60">
                    {n.linkTo ? (
                      <Link
                        to={n.linkTo}
                        onClick={() => {
                          setIsOpen(false);
                          if (!n.isRead) notificationApi.markAsRead(n.id);
                        }}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        View Details <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span />
                    )}
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-100 text-center bg-slate-50/50">
            <Link
              to={user.role === 'admin' ? '/admin/dashboard' : `/${user.role}/notifications`}
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-slate-600 hover:text-indigo-600"
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
