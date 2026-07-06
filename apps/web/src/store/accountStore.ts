// src/store/accountStore.ts
//
// Manages FinancialAccount and SetupStatus.
// SetupStatus drives the setup wizard routing in App.tsx.
//
// Boot sequence role:
//   1. authStore.hydrateUser() completes
//   2. accountStore.fetchSetupStatus() called
//   3. status.setup_complete → route to /dashboard or /setup
//   4. SetupWizard reads getFirstIncompleteScreen()
//      to show the correct screen

import { create } from "zustand"
import {
  getAccount,
  updateAccount,
  resetFinancialData,
  getSetupStatus,
} from "../api/account"
import type {
  FinancialAccount,
  SetupStatus,
} from "../types"

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as any).response
    if (typeof res?.data?.detail === "string") return res.data.detail
    if (typeof res?.data?.error  === "string") return res.data.error
    if (res?.status === 404) return "Account not found."
    if (res?.status === 400) return "Invalid request. Please try again."
  }
  return "Something went wrong. Please try again."
}

interface AccountStore {
  // State
  account:     FinancialAccount | null
  setupStatus: SetupStatus | null
  isLoading:   boolean
  error:       string | null

  // Actions
  fetchAccount:       () => Promise<void>
  updateAccountName:  (name: string) => Promise<void>
  fetchSetupStatus:   () => Promise<SetupStatus>
  resetData:          () => Promise<void>
  getFirstIncompleteScreen: () => 2 | 3 | 4 | null
  clearError:         () => void
  reset:              () => void
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState = {
  account:     null,
  setupStatus: null,
  isLoading:   false,
  error:       null,
}

// ── Store ─────────────────────────────────────────────────────────────
export const useAccountStore = create<AccountStore>()((set, get) => ({
  ...initialState,

  fetchAccount: async () => {
    set({ isLoading: true, error: null })
    try {
      const account = await getAccount()
      set({ account, isLoading: false })
    } catch (error) {
      set({
        isLoading: false,
        error:     _parseError(error),
      })
    }
  },

  updateAccountName: async (name: string) => {
    set({ isLoading: true, error: null })
    try {
      const account = await updateAccount({ name })
      set({ account, isLoading: false })
    } catch (error) {
      set({
        isLoading: false,
        error:     _parseError(error),
      })
      throw error
    }
  },

  fetchSetupStatus: async () => {
    set({ isLoading: true, error: null })
    try {
      const status = await getSetupStatus()
      set({ setupStatus: status, isLoading: false })

      if (status.active_cycle !== undefined) {
        const { useCycleStore } = await import("./cycleStore")
        useCycleStore.getState().syncFromProfile({ active_cycle: status.active_cycle } as any)
      }

      return status
    } catch (error) {
      set({
        isLoading: false,
        error:     _parseError(error),
      })
      const fallback: SetupStatus = {
        has_account:      false,
        has_custom_funds: false,
        has_balances:     false,
        has_budget:       false,
        setup_complete:   false,
      }
      set({ setupStatus: fallback })
      return fallback
    }
  },

  resetData: async () => {
    set({ isLoading: true, error: null })
    try {
      await resetFinancialData()

      const { useFundStore } = await import("./fundStore")
      await useFundStore.getState().fetchFunds()

      const { useCycleStore } = await import("./cycleStore")
      useCycleStore.getState().reset()

      const { useExpenseStore } = await import("./expenseStore")
      useExpenseStore.getState().reset()

      const { useTransferStore } = await import("./transferStore")
      useTransferStore.getState().reset()

      const { useAlertStore } = await import("./alertStore")
      useAlertStore.getState().reset()

      const { useNetWorthStore } = await import("./netWorthStore")
      useNetWorthStore.getState().reset()

      await get().fetchSetupStatus()

      set({ isLoading: false })
    } catch (error) {
      set({
        isLoading: false,
        error:     _parseError(error),
      })
      throw error
    }
  },

  getFirstIncompleteScreen: (): 2 | 3 | 4 | null => {
    const status = get().setupStatus
    if (!status) return 2
    if (!status.has_custom_funds) return 2
    if (!status.has_balances)     return 3
    if (!status.has_budget)       return 4
    return null
  },

  clearError: () => set({ error: null }),
  reset:      () => set(initialState),
}))
