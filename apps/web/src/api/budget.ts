// src/api/budget.ts
//
// Monthly budget setup API calls.
// Non-destructive — each update creates a new row
// with effective_from date, preserving full history.
//
// Endpoints:
//   GET  /api/budget/        → getBudgetSetups
//   POST /api/budget/update/ → updateBudgetSetup
//   POST /api/setup/budget/  → createInitialBudgetSetup

import { apiClient } from "./client"
import type {
  MonthlyBudgetSetup,
  MonthlyBudgetSetupPayload,
} from "../types"

function buildBudgetPayload(
  payload: MonthlyBudgetSetupPayload,
): MonthlyBudgetSetupPayload {
  return {
    estimated_monthly_income: payload.estimated_monthly_income,
    needs_budget: payload.needs_budget,
    wants_budget: payload.wants_budget,
    ...(payload.effective_from && { effective_from: payload.effective_from }),
  }
}

// ── 1. Get all budget setups (history, newest first) ──────────────────
export async function getBudgetSetups(): Promise<MonthlyBudgetSetup[]> {
  const { data } = await apiClient.get<MonthlyBudgetSetup[]>("/budget/")
  return data
}

// ── 2. Update budget (creates new row, non-destructive) ───────────────
export async function updateBudgetSetup(
  payload: MonthlyBudgetSetupPayload,
): Promise<MonthlyBudgetSetup> {
  const { data } = await apiClient.post<MonthlyBudgetSetup>(
    "/budget/update/",
    buildBudgetPayload(payload),
  )
  return data
}

// ── 3. Create initial budget setup (setup wizard only) ────────────────
export async function createInitialBudgetSetup(
  payload: MonthlyBudgetSetupPayload,
): Promise<MonthlyBudgetSetup> {
  const { data } = await apiClient.post<MonthlyBudgetSetup>(
    "/setup/budget/",
    buildBudgetPayload(payload),
  )
  return data
}
