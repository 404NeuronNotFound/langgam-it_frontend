// src/api/account.ts
//
// Financial account and setup status API calls.
//
// Endpoints:
//   GET   /api/account/       → getAccount
//   PATCH /api/account/       → updateAccount
//   POST  /api/account/reset/ → resetFinancialData
//   GET   /api/setup/status/  → getSetupStatus

import { isAxiosError } from "axios"
import { apiClient } from "./client"
import type { FinancialAccount, SetupStatus } from "../types"

const DEFAULT_SETUP_STATUS: SetupStatus = {
  has_account: false,
  has_custom_funds: false,
  has_balances: false,
  has_budget: false,
  setup_complete: false,
}

// ── 1. Get account ────────────────────────────────────────────────────
export async function getAccount(): Promise<FinancialAccount> {
  const { data } = await apiClient.get<FinancialAccount>("/account/")
  return data
}

// ── 2. Update account name ────────────────────────────────────────────
export async function updateAccount(payload: {
  name: string
}): Promise<FinancialAccount> {
  const { data } = await apiClient.patch<FinancialAccount>("/account/", payload)
  return data
}

// ── 3. Reset financial data ───────────────────────────────────────────
export async function resetFinancialData(): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("/account/reset/")
  return data
}

// ── 4. Get setup status ───────────────────────────────────────────────
export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    const { data } = await apiClient.get<SetupStatus>("/setup/status/")
    return data
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return DEFAULT_SETUP_STATUS
    }
    throw error
  }
}
