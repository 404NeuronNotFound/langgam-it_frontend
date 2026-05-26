// src/api/income.ts
//
// Income entry and survival draw API calls.
//
// Endpoints:
//   POST /api/income/                → submitIncome
//   POST /api/income/survival-draw/  → submitSurvivalDraw
//
// Flow:
//   1. User enters income amount on IncomePage
//   2. submitIncome() called
//      → if survival_mode false: done, update stores
//      → if survival_mode true: show confirmation modal
//   3. User confirms → submitSurvivalDraw() called
//      → Emergency Fund drawn → Cash on Hand
//      → update stores with response profile

import { apiClient } from "./client"
import type {
  IncomePayload,
  IncomeResponse,
  SurvivalDrawResponse,
} from "../types"

// ── 1. Submit monthly income ──────────────────────────────────────────
export async function submitIncome(
  payload: IncomePayload
): Promise<IncomeResponse> {
  const body: Record<string, unknown> = {
    income: payload.income,
  }
  if (payload.year !== undefined) body.year = payload.year
  if (payload.month !== undefined) body.month = payload.month

  const { data } = await apiClient.post<IncomeResponse>("/income/", body)
  return data
}

// ── 2. Confirm survival draw (zero income month) ──────────────────────
export async function submitSurvivalDraw(): Promise<SurvivalDrawResponse> {
  const { data } = await apiClient.post<SurvivalDrawResponse>(
    "/income/survival-draw/",
    {}
  )
  return data
}
