// src/api/alerts.ts
//
// Alert API calls — AI-generated spending warnings.
// Alerts are created server-side by the monitoring engine
// after every expense. Frontend fetches and dismisses them.
//
// Alert types:
//   overspend     — spending ahead of monthly pace
//   daily_limit   — today's spend exceeded daily guideline
//   hard_stop     — monthly budget fully depleted
//   emergency_low — Emergency Fund below ₱10,000 threshold
//   goal_behind   — goal fund behind target pace
//
// Endpoints:
//   GET   /api/alerts/              → getAlerts
//   PATCH /api/alerts/<id>/read/    → markAlertRead

import { apiClient } from "./client"
import type { Alert } from "../types"

// ── Local query param type ────────────────────────────────────────────
interface AlertListParams {
  all?: boolean
}

// ── 1. Get alerts ─────────────────────────────────────────────────────
export async function getAlerts(params?: AlertListParams): Promise<Alert[]> {
  const { data } = await apiClient.get<Alert[]>("/alerts/", {
    params: {
      ...(params?.all === true && { all: "true" }),
    },
  })
  return data
}

// ── 2. Mark alert as read ─────────────────────────────────────────────
export async function markAlertRead(id: number): Promise<Alert> {
  const { data } = await apiClient.patch<Alert>(`/alerts/${id}/read/`, {})
  return data
}
