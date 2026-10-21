import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { notificationApi } from '../../services/api';
import type { Notification } from '../../types';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await notificationApi.getNotifications(user.id);
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationApi.markAllAsRead(user.id);
    await fetchNotifs();
  };

  const handleMarkRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    await fetchNotifs();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            Notifications Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System notices, approval outcomes, customer messages, and moderation actions
          </p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All as Read
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            You don't have any notifications right now.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition ${
                  !n.isRead ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">{n.title}</span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span>
                      {new Date(n.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {n.linkTo && (
                      <Link
                        to={n.linkTo}
                        onClick={() => !n.isRead && handleMarkRead(n.id)}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        Go to Details <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition whitespace-nowrap shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
