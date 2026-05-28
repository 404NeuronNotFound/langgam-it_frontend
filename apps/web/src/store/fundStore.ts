import { create } from "zustand"
import {
  getFunds,
  createFund,
  updateFund,
  reorderFunds,
  closeFund,
  getAllocationSuggestion,
  setupBalances,
} from "../api/funds"
import type {
  Fund,
  FundState,
  FundCreatePayload,
  FundUpdatePayload,
  AllocationSuggestion,
  AccountProfile,
} from "../types"

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as any).response
    if (typeof res?.data?.detail === "string") return res.data.detail
    if (typeof res?.data?.error === "string") return res.data.error
    if (res?.status === 404) return "Fund not found."
    if (res?.status === 400)
      return res.data?.error ?? "Invalid request. Please check your input."
  }
  return "Something went wrong. Please try again."
}

function _is404(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "response" in error &&
    (error as any).response?.status === 404
  )
}

// ── Store shape ───────────────────────────────────────────────────────
interface FundStore extends FundState {
  // Extended state
  suggestion: AllocationSuggestion | null

  // Async Actions
  fetchFunds: () => Promise<void>
  addFund: (payload: FundCreatePayload) => Promise<Fund>
  editFund: (id: number, payload: FundUpdatePayload) => Promise<Fund>
  reorderFunds: (order: number[]) => Promise<void>
  closeFund: (id: number, note: string) => Promise<void>
  fetchSuggestion: () => Promise<void>
  saveSetupBalances: (
    balances: Record<number, number>
  ) => Promise<{ net_worth: string; funds: Fund[] }>

  // Sync Action
  syncFromProfile: (profile: AccountProfile) => void

  // Computed getters
  getFundById: (id: number) => Fund | undefined
  getSystemFund: (name: string) => Fund | undefined
  getCashOnHand: () => Fund | undefined
  getEmergencyFund: () => Fund | undefined
  getSavingsFund: () => Fund | undefined
  getGoalFunds: () => Fund[]
  getTotalBalance: () => number
  getTotalMonthlyAlloc: () => number

  // Utils
  clearError: () => void
  reset: () => void
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState = {
  funds: [],
  suggestion: null,
  isLoading: false,
  error: null,
}

// ── Store ─────────────────────────────────────────────────────────────
export const useFundStore = create<FundStore>()((set, get) => ({
  ...initialState,

  // ── Async actions ──────────────────────────────────────────────────

  fetchFunds: async () => {
    set({ isLoading: true, error: null })
    try {
      const funds = await getFunds()
      set({ funds, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  addFund: async (payload: FundCreatePayload) => {
    set({ isLoading: true, error: null })
    try {
      const fund = await createFund(payload)
      set((state) => ({
        funds: [...state.funds, fund],
        isLoading: false,
      }))

      const { useAccountStore } = await import("./accountStore")
      await useAccountStore.getState().fetchSetupStatus()

      return fund
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  editFund: async (id: number, payload: FundUpdatePayload) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await updateFund(id, payload)
      set((state) => ({
        funds: state.funds.map((f) => (f.id === id ? updated : f)),
        isLoading: false,
      }))
      return updated
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  reorderFunds: async (order: number[]) => {
    set({ isLoading: true, error: null })
    try {
      const reordered = await reorderFunds(order)
      set({ funds: reordered, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  closeFund: async (id: number, note: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await closeFund(id, note)
      set((state) => ({
        funds: state.funds.map((f) => (f.id === id ? result.fund : f)),
        isLoading: false,
      }))

      await get().fetchFunds()

      const { useNetWorthStore } = await import("./netWorthStore")
      await useNetWorthStore.getState().fetchCurrentNetWorth()
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  fetchSuggestion: async () => {
    try {
      const suggestion = await getAllocationSuggestion()
      set({ suggestion })
    } catch (error) {
      if (!_is404(error)) {
        set({ error: _parseError(error) })
      }
    }
  },

  saveSetupBalances: async (balances: Record<number, number>) => {
    set({ isLoading: true, error: null })
    try {
      const result = await setupBalances(balances)
      set({ funds: result.funds, isLoading: false })

      const { useNetWorthStore } = await import("./netWorthStore")
      useNetWorthStore.getState().setCurrentNetWorth(result.net_worth)

      const { useAccountStore } = await import("./accountStore")
      await useAccountStore.getState().fetchSetupStatus()

      return { net_worth: result.net_worth, funds: result.funds }
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  // ── Sync action ────────────────────────────────────────────────────

  syncFromProfile: (profile: AccountProfile) => {
    if (profile.funds && profile.funds.length > 0) {
      set({ funds: profile.funds })
    }
  },

  // ── Computed getters ───────────────────────────────────────────────

  getFundById: (id: number) => get().funds.find((f) => f.id === id),

  getSystemFund: (name: string) =>
    get().funds.find((f) => f.type === "system_required" && f.name === name),

  getCashOnHand: () => get().getSystemFund("Cash on Hand"),

  getEmergencyFund: () => get().getSystemFund("Emergency Fund"),

  getSavingsFund: () => get().getSystemFund("Savings"),

  getGoalFunds: () =>
    get().funds.filter((f) => f.type === "goal" && f.status === "active"),

  getTotalBalance: () =>
    get()
      .funds.filter((f) => f.status === "active")
      .reduce((sum, f) => sum + parseFloat(f.current_balance), 0),

  getTotalMonthlyAlloc: () =>
    get()
      .funds.filter((f) => f.status === "active")
      .reduce((sum, f) => sum + parseFloat(f.monthly_allocation), 0),

  // ── Utilities ──────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}))
