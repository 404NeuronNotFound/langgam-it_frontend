import { create } from "zustand"
import {
  getExpenses,
  createExpense,
  getDailyLimit,
} from "../api/expenses"
import type {
  Expense,
  ExpenseCreatePayload,
  ExpenseResponse,
  DailyLimit,
  ExpenseState,
  AccountProfile,
  ExpenseCategory,
} from "../types"

// ── Local types ───────────────────────────────────────────────────────
interface ExpenseFetchParams {
  cycle?: number
  category?: ExpenseCategory
  limit?: number
}

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as any).response
    if (typeof res?.data?.detail === "string") return res.data.detail
    if (typeof res?.data?.error === "string") return res.data.error
    if (res?.status === 400) {
      if (res.data?.amount) {
        return `Amount: ${
          Array.isArray(res.data.amount) ? res.data.amount[0] : res.data.amount
        }`
      }
      if (res.data?.category) {
        return `Category: ${
          Array.isArray(res.data.category)
            ? res.data.category[0]
            : res.data.category
        }`
      }
      return res.data?.error ?? "Invalid expense. Please check your input."
    }
    if (res?.status === 404) return "No active cycle. Submit income first."
  }
  return "Something went wrong. Please try again."
}

// ── Store shape ───────────────────────────────────────────────────────
interface ExpenseStore extends ExpenseState {
  // Actions
  fetchExpenses: (params?: ExpenseFetchParams) => Promise<void>
  fetchByCategory: (category: ExpenseCategory) => Promise<void>
  addExpense: (payload: ExpenseCreatePayload) => Promise<ExpenseResponse>
  fetchDailyLimit: () => Promise<void>
  syncFromProfile: (profile: AccountProfile) => void

  // Computed getters
  getTodayExpenses: () => Expense[]
  getTodayTotal: () => number
  getNeedsTotal: () => number
  getWantsTotal: () => number
  getExpensesByDate: () => Record<string, Expense[]>
  getDailyLimitNumber: () => number
  isOverDailyLimit: () => boolean
  getRemainingToday: () => number

  clearError: () => void
  reset: () => void
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState = {
  expenses: [] as Expense[],
  dailyLimit: null as DailyLimit | null,
  isLoading: false,
  error: null as string | null,
}

// ── Store ─────────────────────────────────────────────────────────────
export const useExpenseStore = create<ExpenseStore>()((set, get) => ({
  ...initialState,

  // ── Async actions ──────────────────────────────────────────────────

  fetchExpenses: async (params?: ExpenseFetchParams) => {
    set({ isLoading: true, error: null })
    try {
      const expenses = await getExpenses(params)
      set({ expenses, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  fetchByCategory: async (category: ExpenseCategory) => {
    set({ isLoading: true, error: null })
    try {
      const expenses = await getExpenses({ category })
      set({ expenses, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  addExpense: async (payload: ExpenseCreatePayload) => {
    set({ isLoading: true, error: null })
    try {
      const response = await createExpense(payload)

      // Prepend new expense to list
      set((state) => ({
        expenses: [response.expense, ...state.expenses],
        isLoading: false,
      }))

      // Sync cycle
      const { useCycleStore } = await import("./cycleStore")
      useCycleStore.getState().syncFromProfile(response.profile)

      // Sync fund balances
      const { useFundStore } = await import("./fundStore")
      useFundStore.getState().syncFromProfile(response.profile)

      // Update net worth
      const { useNetWorthStore } = await import("./netWorthStore")
      useNetWorthStore.getState().setCurrentNetWorth(response.profile.net_worth)

      // Push new alerts to alertStore
      if (response.alerts.length > 0) {
        const { useAlertStore } = await import("./alertStore")
        useAlertStore.getState().addAlerts(response.alerts)
      }

      // Refresh daily limit
      await get().fetchDailyLimit()

      return response
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  fetchDailyLimit: async () => {
    try {
      const dailyLimit = await getDailyLimit()
      set({ dailyLimit })
    } catch (error) {
      set({ dailyLimit: null })
    }
  },

  // ── Sync actions ──────────────────────────────────────────────────

  syncFromProfile: (profile: AccountProfile) => {
    // no-op
    void profile
  },

  // ── Computed getters ───────────────────────────────────────────────

  getTodayExpenses: () => {
    const today = new Date().toISOString().split("T")[0]
    return get().expenses.filter((e) => e.date === today)
  },

  getTodayTotal: () =>
    get()
      .getTodayExpenses()
      .reduce((sum, e) => sum + parseFloat(e.amount), 0),

  getNeedsTotal: () =>
    get()
      .expenses.filter((e) => e.category === "needs")
      .reduce((sum, e) => sum + parseFloat(e.amount), 0),

  getWantsTotal: () =>
    get()
      .expenses.filter((e) => e.category === "wants")
      .reduce((sum, e) => sum + parseFloat(e.amount), 0),

  getExpensesByDate: () => {
    const grouped: Record<string, Expense[]> = {}
    get().expenses.forEach((e) => {
      if (!grouped[e.date]) grouped[e.date] = []
      grouped[e.date].push(e)
    })
    return grouped
  },

  getDailyLimitNumber: () => {
    const dl = get().dailyLimit
    return dl ? parseFloat(dl.daily_limit) : 0
  },

  isOverDailyLimit: () => {
    const dl = get().dailyLimit
    if (!dl) return false
    return parseFloat(dl.today_spent) > parseFloat(dl.daily_limit)
  },

  getRemainingToday: () => {
    const dl = get().dailyLimit
    if (!dl) return 0
    return Math.max(0, parseFloat(dl.daily_limit) - parseFloat(dl.today_spent))
  },

  // ── Utilities ──────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}))
