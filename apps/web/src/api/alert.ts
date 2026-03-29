// API functions for alerts

import { apiClient } from "./client";
import type { Alert } from "@/types/expense";

// Get all alerts (unread first)
export async function getAlerts(): Promise<Alert[]> {
  const response = await apiClient.get("/alerts/");
  return response.data;
}

// Mark alert as read
export async function markAlertAsRead(alertId: number): Promise<Alert> {
  const response = await apiClient.post(`/alerts/${alertId}/read/`);
  return response.data;
}

// Get unread alerts count
export async function getUnreadAlertsCount(alerts: Alert[]): number {
  return alerts.filter((alert) => !alert.is_read).length;
}
