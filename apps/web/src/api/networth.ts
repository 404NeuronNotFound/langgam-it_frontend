// src/api/networth.ts
//
// Net worth snapshot history and month-close engine.
// This is the final API file in the Langgam-It frontend.
//
// Endpoints:
//   GET  /api/networth/snapshots/  → getNetWorthSnapshots
//   POST /api/month/close/         → closeMonth
//
// Snapshot capture triggers (server-side, automatic):
//   POST /api/setup/balances/      initial balance entry
//   POST /api/income/              monthly income allocation
//   POST /api/transfers/           any fund transfer
//   POST /api/expenses/            any expense logged
//   POST /api/funds/<id>/close/    fund closed/completed
//   POST /api/month/close/         end-of-month close
//
// Chart data flow:
//   netWorthStore.snapshots → sorted oldest first →
//   mapped to { date, value } → fed to NetWorthChart component

import { apiClient } from "./client"
import type { NetWorthSnapshot, MonthSummary, AccountProfile } from "../types"

// ── Local types ───────────────────────────────────────────────────────
interface SnapshotListParams {
  limit?: number
}

interface CloseMonthResponse {
  message: string
  summary: MonthSummary
  profile: AccountProfile
}

// ── 1. Get net worth snapshot history ─────────────────────────────────
export async function getNetWorthSnapshots(
  params?: SnapshotListParams
): Promise<NetWorthSnapshot[]> {
  const { data } = await apiClient.get<NetWorthSnapshot[]>(
    "/networth/snapshots/",
    {
      params: {
        ...(params?.limit !== undefined && { limit: params.limit }),
      },
    }
  )
  return data
}

// ── 2. Close current month ────────────────────────────────────────────
export async function closeMonth(): Promise<CloseMonthResponse> {
  const { data } = await apiClient.post<CloseMonthResponse>("/month/close/", {})
  return data
}

export type { CloseMonthResponse }
