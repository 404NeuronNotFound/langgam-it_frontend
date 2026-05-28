import { create } from "zustand"
import { submitIncome, submitSurvivalDraw } from "../api/income"
import { closeMonth } from "../api/networth"
import type {
  MonthCycle,
  IncomePayload,
  IncomeResponse,
  SurvivalDrawResponse,
  CycleState,
  AccountProfile,
} from "../types"

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as any).response
    if (typeof res?.data?.detail === "string") return res.data.detail
    if (typeof res?.data?.error === "string") return res.data.error
    if (res?.status === 400)
      return res.data?.error ?? "Invalid request. Please check your input."
    if (res?.status === 404) return "No active cycle found."
  }
  return "Something went wrong. Please try again."
}

// ── Store shape ───────────────────────────────────────────────────────
interface CycleStore extends CycleState {
  // Actions
  submitIncome: (payload: IncomePayload) => Promise<IncomeResponse>
  confirmSurvivalDraw: () => Promise<SurvivalDrawResponse>
  declineSurvivalDraw: () => void
  closeMonth: () => Promise<void>
  syncFromProfile: (profile: AccountProfile) => void

  // Computed getters
  hasActiveCycle: () => boolean
  getNeedsRemaining: () => number
  getWantsRemaining: () => number
  getTotalSpent: () => number
  getRemainingBudget: () => number
  getNeedsProgress: () => number // 0-100 percentage
  getWantsProgress: () => number // 0-100 percentage
  getIncomeScenarioLabel: () => string

  clearError: () => void
  reset: () => void
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState = {
  activeCycle: null as MonthCycle | null,
  isLoading: false,
  error: null as string | null,
  survivalMode: false,
  survivalPrompt: null as string | null,
}

// ── Store ─────────────────────────────────────────────────────────────
export const useCycleStore = create<CycleStore>()((set, get) => ({
  ...initialState,

  // ── Async actions ──────────────────────────────────────────────────

  submitIncome: async (payload: IncomePayload) => {
    set({ isLoading: true, error: null })
    try {
      const response = await submitIncome(payload)
      set({ activeCycle: response.cycle })

      if (response.survival_mode) {
        set({
          survivalMode: true,
          survivalPrompt: response.survival_prompt ?? null,
          isLoading: false,
        })
      } else {
        set({
          survivalMode: false,
          survivalPrompt: null,
          isLoading: false,
        })
      }

      // Sync funds and net worth from profile
      const { useFundStore } = await import("./fundStore")
      useFundStore.getState().syncFromProfile(response.profile)

      const { useNetWorthStore } = await import("./netWorthStore")
      useNetWorthStore.getState().setCurrentNetWorth(response.profile.net_worth)

      // Fetch fresh snapshots for chart update
      await useNetWorthStore.getState().fetchSnapshots()

      return response
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  confirmSurvivalDraw: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await submitSurvivalDraw()
      set({
        activeCycle: response.profile.active_cycle,
        survivalMode: false,
        survivalPrompt: null,
        isLoading: false,
      })

      // Sync funds
      const { useFundStore } = await import("./fundStore")
      useFundStore.getState().syncFromProfile(response.profile)

      // Sync net worth
      const { useNetWorthStore } = await import("./netWorthStore")
      useNetWorthStore.getState().setCurrentNetWorth(response.profile.net_worth)

      // Add survival draw transfer
      const { useTransferStore } = await import("./transferStore")
      useTransferStore.getState().prependTransfer(response.transfer)

      return response
    } catch (error) {
      set({
        isLoading: false,
        survivalMode: false,
        survivalPrompt: null,
        error: _parseError(error),
      })
      throw error
    }
  },

  declineSurvivalDraw: () => {
    set({
      survivalMode: false,
      survivalPrompt: null,
    })
  },

  closeMonth: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await closeMonth()

      set({
        activeCycle: null,
        survivalMode: false,
        survivalPrompt: null,
        isLoading: false,
      })

      // Sync funds
      const { useFundStore } = await import("./fundStore")
      useFundStore.getState().syncFromProfile(response.profile)

      // Update net worth and summary
      const { useNetWorthStore } = await import("./netWorthStore")
      const nwStore = useNetWorthStore.getState()
      nwStore.setCurrentNetWorth(response.profile.net_worth)
      nwStore.addSummary(response.summary)

      // Fetch fresh snapshots
      await nwStore.fetchSnapshots()

      // Clear current cycle expenses
      const { useExpenseStore } = await import("./expenseStore")
      useExpenseStore.getState().reset()

      // Clear alerts
      const { useAlertStore } = await import("./alertStore")
      useAlertStore.getState().reset()
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  // ── Sync actions ──────────────────────────────────────────────────

  syncFromProfile: (profile: AccountProfile) => {
    if (profile.active_cycle !== undefined) {
      set({ activeCycle: profile.active_cycle })
    }
  },

  // ── Computed getters ───────────────────────────────────────────────

  hasActiveCycle: () => get().activeCycle !== null,

  getNeedsRemaining: () => {
    const c = get().activeCycle
    return c ? parseFloat(c.needs_remaining) : 0
  },

  getWantsRemaining: () => {
    const c = get().activeCycle
    return c ? parseFloat(c.wants_remaining) : 0
  },

  getTotalSpent: () => {
    const c = get().activeCycle
    return c ? parseFloat(c.total_spent) : 0
  },

  getRemainingBudget: () => {
    const c = get().activeCycle
    return c ? parseFloat(c.remaining_budget) : 0
  },

  getNeedsProgress: () => {
    const c = get().activeCycle
    if (!c) return 0
    const budget = parseFloat(c.needs_budget_used)
    if (budget <= 0) return 0
    const spent = parseFloat(c.needs_spent)
    return Math.min(100, Math.round((spent / budget) * 100))
  },

  getWantsProgress: () => {
    const c = get().activeCycle
    if (!c) return 0
    const budget = parseFloat(c.wants_budget_used)
    if (budget <= 0) return 0
    const spent = parseFloat(c.wants_spent)
    return Math.min(100, Math.round((spent / budget) * 100))
  },

  getIncomeScenarioLabel: () => {
    const scenario = get().activeCycle?.income_scenario
    switch (scenario) {
      case "full":
        return "Full income month"
      case "low":
        return "Low income month"
      case "zero":
        return "Zero income month"
      default:
        return ""
    }
  },

  // ── Utilities ──────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}))
