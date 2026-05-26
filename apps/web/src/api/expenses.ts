// src/api/expenses.ts
//
// Expense tracking API calls.
// All spending is deducted from Cash on Hand fund.
// AI monitoring engine runs after every new expense.
//
// Endpoints:
//   GET  /api/expenses/              → getExpenses
//   POST /api/expenses/              → createExpense
//   GET  /api/expenses/daily-limit/  → getDailyLimit
//
// Flow:
//   1. User logs expense on ExpensesPage
//   2. createExpense() called
//   3. Backend deducts from Cash on Hand + updates cycle
//   4. AI monitoring runs → alerts created if thresholds hit
//   5. Response contains: expense + updated cycle +
//      updated profile + any new alerts
//   6. Frontend updates all stores from single response

import { isAxiosError } from "axios"
import { apiClient } from "./client"
import type {
  Expense,
  ExpenseCreatePayload,
  ExpenseResponse,
  DailyLimit,
} from "../types"

// ── Local query param type ────────────────────────────────────────────
interface ExpenseListParams {
  cycle?: number
  category?: "needs" | "wants"
  limit?: number
}

// ── 1. Get expenses ───────────────────────────────────────────────────
export async function getExpenses(
  params?: ExpenseListParams
): Promise<Expense[]> {
  const { data } = await apiClient.get<Expense[]>("/expenses/", {
    params: {
      ...(params?.cycle !== undefined && { cycle: params.cycle }),
      ...(params?.category !== undefined && { category: params.category }),
      ...(params?.limit !== undefined && { limit: params.limit }),
    },
  })
  return data
}

// ── 2. Create expense ─────────────────────────────────────────────────
export async function createExpense(
  payload: ExpenseCreatePayload
): Promise<ExpenseResponse> {
  const body: Record<string, unknown> = {
    amount: payload.amount,
    category: payload.category,
  }
  if (payload.description !== undefined) {
    body.description = payload.description
  }
  if (payload.date !== undefined) {
    body.date = payload.date
  }

  const { data } = await apiClient.post<ExpenseResponse>("/expenses/", body)
  return data
}

// ── 3. Get daily limit ────────────────────────────────────────────────
export async function getDailyLimit(): Promise<DailyLimit | null> {
  try {
    const { data } = await apiClient.get<DailyLimit>("/expenses/daily-limit/")
    return data
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  }
}
