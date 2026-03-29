// Zustand store for alerts

import { create } from "zustand";
import type { Alert } from "@/types/expense";
import { getAlerts, markAlertAsRead } from "@/api/alert";

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAlerts: () => Promise<void>;
  markAsRead: (alertId: number) => Promise<void>;
  dismissAlert: (alertId: number) => void;
  reset: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const alerts = await getAlerts();
      const unreadCount = alerts.filter((a) => !a.is_read).length;
      set({ alerts, unreadCount, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch alerts", isLoading: false });
    }
  },

  markAsRead: async (alertId: number) => {
    try {
      const updatedAlert = await markAlertAsRead(alertId);
      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === alertId ? updatedAlert : alert
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      set({ error: error.message || "Failed to mark alert as read" });
    }
  },

  dismissAlert: (alertId: number) => {
    set((state) => {
      const alert = state.alerts.find((a) => a.id === alertId);
      const wasUnread = alert && !alert.is_read;
      
      return {
        alerts: state.alerts.filter((a) => a.id !== alertId),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },

  reset: () => {
    set({
      alerts: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    });
  },
}));
