import type { Notification, NotificationType } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';

export const notificationApi = {
  async getNotifications(userId: string): Promise<Notification[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type as NotificationType,
            isRead: Boolean(n.is_read),
            linkTo: n.link_to,
            createdAt: n.created_at,
          }));
        }
      } catch (err) {
        console.warn('Supabase getNotifications error:', err);
      }
    }

    const data = loadStorageData();
    const notifs = data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return simulateLatency(notifs, 80);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (!error && typeof count === 'number') {
          return count;
        }
      } catch (err) {
        console.warn('Supabase getUnreadCount error:', err);
      }
    }

    const data = loadStorageData();
    const count = data.notifications.filter((n) => n.userId === userId && !n.isRead).length;
    return simulateLatency(count, 50);
  },

  async markAsRead(notificationId: string): Promise<void> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      } catch (err) {
        console.warn('Supabase markAsRead error:', err);
      }
    }

    const data = loadStorageData();
    const target = data.notifications.find((n) => n.id === notificationId);
    if (target) {
      target.isRead = true;
      saveStorageData(data);
    }
    return simulateLatency(undefined, 50);
  },

  async markAllAsRead(userId: string): Promise<void> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId);
      } catch (err) {
        console.warn('Supabase markAllAsRead error:', err);
      }
    }

    const data = loadStorageData();
    data.notifications.forEach((n) => {
      if (n.userId === userId) {
        n.isRead = true;
      }
    });
    saveStorageData(data);
    return simulateLatency(undefined, 80);
  },

  async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    linkTo?: string;
  }): Promise<Notification> {
    const now = new Date().toISOString();
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      isRead: false,
      linkTo: params.linkTo,
      createdAt: now,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('notifications').insert({
          id: newNotif.id,
          user_id: newNotif.userId,
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          is_read: false,
          link_to: newNotif.linkTo || null,
          created_at: now,
        });
      } catch (err) {
        console.warn('Supabase createNotification error:', err);
      }
    }

    const data = loadStorageData();
    data.notifications.unshift(newNotif);
    saveStorageData(data);

    return simulateLatency(newNotif, 80);
  },
};
