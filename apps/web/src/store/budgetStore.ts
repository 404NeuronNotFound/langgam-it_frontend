import { create } from "zustand"
import {
  getBudgetSetups,
  updateBudgetSetup,
  createInitialBudgetSetup,
} from "../api/budget"
import type {
  MonthlyBudgetSetup,
  MonthlyBudgetSetupPayload,
  BudgetState,
} from "../types"

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as any).response
    if (typeof res?.data?.detail === "string") return res.data.detail
    if (typeof res?.data?.error === "string") return res.data.error
    // DRF field validation errors
    if (res?.data && typeof res.data === "object") {
      const messages = Object.entries(res.data).map(([field, msgs]) => {
        const msgStr = Array.isArray(msgs) ? msgs.join(" ") : String(msgs)
        return `${field}: ${msgStr}`
      })
      if (messages.length > 0) return messages[0]
    }
    if (res?.status === 400) return "Please check your budget values."
    if (res?.status === 404) return "Budget setup not found."
  }
  return "Something went wrong. Please try again."
}

// ── Store shape ───────────────────────────────────────────────────────
interface BudgetStore extends BudgetState {
  // Actions
  fetchSetups: () => Promise<void>
  updateSetup: (
    payload: MonthlyBudgetSetupPayload
  ) => Promise<MonthlyBudgetSetup>
  createInitialSetup: (
    payload: MonthlyBudgetSetupPayload
  ) => Promise<MonthlyBudgetSetup>

  // Computed getters
  getEstimatedIncome: () => number
  getNeedsbudget: () => number
  getWantsBudget: () => number
  getTotalExpenseBudget: () => number
  getAllocationWarning: () => string | null
  isOverAllocated: (totalFundAlloc: number) => boolean

  clearError: () => void
  reset: () => void
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState = {
  setups: [] as MonthlyBudgetSetup[],
  activeSetup: null,
  isLoading: false,
  error: null,
}

// ── Store ─────────────────────────────────────────────────────────────
export const useBudgetStore = create<BudgetStore>()((set, get) => ({
  ...initialState,

  // ── Async actions ──────────────────────────────────────────────────

  fetchSetups: async () => {
    set({ isLoading: true, error: null })
    try {
      const setups = await getBudgetSetups()
      set({
        setups,
        activeSetup: setups.length > 0 ? setups[0] : null,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  updateSetup: async (payload: MonthlyBudgetSetupPayload) => {
    set({ isLoading: true, error: null })
    try {
      const newSetup = await updateBudgetSetup(payload)
      set((state) => ({
        setups: [newSetup, ...state.setups],
        activeSetup: newSetup,
        isLoading: false,
      }))

      // Refresh allocation suggestion in fundStore
      const { useFundStore } = await import("./fundStore")
      useFundStore.getState().fetchSuggestion()

      return newSetup
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  createInitialSetup: async (payload: MonthlyBudgetSetupPayload) => {
    set({ isLoading: true, error: null })
    try {
      const setup = await createInitialBudgetSetup(payload)
      set({
        setups: [setup],
        activeSetup: setup,
        isLoading: false,
      })

      // Re-check setup status
      const { useAccountStore } = await import("./accountStore")
      await useAccountStore.getState().fetchSetupStatus()

      return setup
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  // ── Computed getters ───────────────────────────────────────────────

  getEstimatedIncome: () => {
    const setup = get().activeSetup
    return setup ? parseFloat(setup.estimated_monthly_income) : 0
  },

  getNeedsbudget: () => {
    const setup = get().activeSetup
    return setup ? parseFloat(setup.needs_budget) : 0
  },

  getWantsBudget: () => {
    const setup = get().activeSetup
    return setup ? parseFloat(setup.wants_budget) : 0
  },

  getTotalExpenseBudget: () => {
    return get().getNeedsbudget() + get().getWantsBudget()
  },

  getAllocationWarning: () => {
    return get().activeSetup?.allocation_warning ?? null
  },

  isOverAllocated: (totalFundAlloc: number) => {
    const income = get().getEstimatedIncome()
    if (income <= 0) return false
    return totalFundAlloc > income
  },

  // ── Utilities ──────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}))
