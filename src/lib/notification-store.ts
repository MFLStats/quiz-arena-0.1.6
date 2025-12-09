import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type { Notification } from '@shared/types';
interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  clearNotification: (userId: string, notificationId: string) => Promise<void>;
}
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,
  fetchNotifications: async (userId: string) => {
    try {
      // Silent fetch (don't set loading true to avoid UI flicker)
      const data = await api<Notification[]>(`/api/notifications?userId=${userId}`);
      // Only update if different to prevent re-renders
      const current = get().notifications;
      if (JSON.stringify(current) !== JSON.stringify(data)) {
        set({ notifications: data });
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  },
  clearNotification: async (userId: string, notificationId: string) => {
    // Optimistic update
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== notificationId)
    }));
    try {
      await api('/api/notifications/clear', {
        method: 'POST',
        body: JSON.stringify({ userId, notificationIds: [notificationId] })
      });
    } catch (e) {
      console.error("Failed to clear notification", e);
      // Re-fetch on error to sync state
      get().fetchNotifications(userId);
    }
  }
}));