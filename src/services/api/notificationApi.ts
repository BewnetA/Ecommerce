import type { Notification, NotificationType } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';

export const notificationApi = {
  async getNotifications(userId: string): Promise<Notification[]> {
    const data = loadStorageData();
    const notifs = data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return simulateLatency(notifs, 80);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const data = loadStorageData();
    const count = data.notifications.filter((n) => n.userId === userId && !n.isRead).length;
    return simulateLatency(count, 50);
  },

  async markAsRead(notificationId: string): Promise<void> {
    const data = loadStorageData();
    const target = data.notifications.find((n) => n.id === notificationId);
    if (target) {
      target.isRead = true;
      saveStorageData(data);
    }
    return simulateLatency(undefined, 50);
  },

  async markAllAsRead(userId: string): Promise<void> {
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
    const data = loadStorageData();
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      isRead: false,
      linkTo: params.linkTo,
      createdAt: new Date().toISOString(),
    };

    data.notifications.unshift(newNotif);
    saveStorageData(data);
    return simulateLatency(newNotif, 50);
  },
};
