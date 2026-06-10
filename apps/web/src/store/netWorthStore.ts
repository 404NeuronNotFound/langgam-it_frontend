import { create } from "zustand"
import {
  getNetWorthSnapshots,
} from "../api/networth"
import type {
  NetWorthSnapshot,
  MonthSummary,
  NetWorthState,
} from "../types"

// ── Local types ───────────────────────────────────────────────────────
interface ChartDataPoint {
  date: string // "YYYY-MM-DD" from captured_at
  net_worth: number // parsed float
  label: string // "May 2026" for axis display
}

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as any).response
    if (typeof res?.data?.detail === "string") return res.data.detail
    if (typeof res?.data?.error === "string") return res.data.error
    if (res?.status === 404) return "No snapshots found."
  }
  return "Something went wrong. Please try again."
}

function _formatMonthLabel(capturedAt: string): string {
  const date = new Date(capturedAt)
  return date.toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  })
}

// ── Store shape ───────────────────────────────────────────────────────
interface NetWorthStore extends NetWorthState {
  // Extended state
  summaries: MonthSummary[]

  // Actions
  fetchSnapshots: (limit?: number) => Promise<void>
  fetchCurrentNetWorth: () => Promise<void>
  setCurrentNetWorth: (value: string) => void
  addSnapshot: (snapshot: NetWorthSnapshot) => void
  addSummary: (summary: MonthSummary) => void

  // Computed getters
  getChartData: () => ChartDataPoint[]
  getChartDataLimited: (limit: number) => ChartDataPoint[]
  getNetWorthNumber: () => number
  getNetWorthChange: () => number
  getNetWorthChangePct: () => number
  getTrendDirection: () => "up" | "down" | "flat"
  getLatestSummary: () => MonthSummary | null
  getSummaryByMonth: (year: number, month: number) => MonthSummary | null

  clearError: () => void
  reset: () => void
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState = {
  snapshots: [] as NetWorthSnapshot[],
  currentNetWorth: "0.00",
  summaries: [] as MonthSummary[],
  isLoading: false,
  error: null as string | null,
}

// ── Store ─────────────────────────────────────────────────────────────
export const useNetWorthStore = create<NetWorthStore>()((set, get) => ({
  ...initialState,

  // ── Async actions ──────────────────────────────────────────────────

  fetchSnapshots: async (limit?: number) => {
    set({ isLoading: true, error: null })
    try {
      const snapshots = await getNetWorthSnapshots(
        limit !== undefined ? { limit } : undefined
      )
      set({
        snapshots,
        currentNetWorth:
          snapshots.length > 0 ? snapshots[0].net_worth : get().currentNetWorth,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  fetchCurrentNetWorth: async () => {
    try {
      const snapshots = await getNetWorthSnapshots({ limit: 1 })
      if (snapshots.length > 0) {
        set({ currentNetWorth: snapshots[0].net_worth })
      }
    } catch (error) {
      // Failed silently
    }
  },

  // ── Sync actions ──────────────────────────────────────────────────

  setCurrentNetWorth: (value: string) => {
    set({ currentNetWorth: value })
  },

  addSnapshot: (snapshot: NetWorthSnapshot) => {
    set((state) => ({
      snapshots: [snapshot, ...state.snapshots],
      currentNetWorth: snapshot.net_worth,
    }))
  },

  addSummary: (summary: MonthSummary) => {
    set((state) => {
      const exists = state.summaries.some(
        (s) => s.cycle_id === summary.cycle_id
      )
      if (exists) return state

      return {
        summaries: [summary, ...state.summaries],
      }
    })
  },

  // ── Computed getters ───────────────────────────────────────────────

  getChartData: (): ChartDataPoint[] =>
    get()
      .snapshots.slice()
      .reverse()
      .map((s) => ({
        date: s.captured_at.split("T")[0],
        net_worth: parseFloat(s.net_worth),
        label: _formatMonthLabel(s.captured_at),
      })),

  getChartDataLimited: (limit: number): ChartDataPoint[] =>
    get()
      .snapshots.slice(0, limit)
      .reverse()
      .map((s) => ({
        date: s.captured_at.split("T")[0],
        net_worth: parseFloat(s.net_worth),
        label: _formatMonthLabel(s.captured_at),
      })),

  getNetWorthNumber: () => parseFloat(get().currentNetWorth || "0"),

  getNetWorthChange: () => {
    const snaps = get().snapshots
    if (snaps.length < 2) return 0
    const current = parseFloat(snaps[0].net_worth)
    const previous = parseFloat(snaps[1].net_worth)
    return current - previous
  },

  getNetWorthChangePct: () => {
    const snaps = get().snapshots
    if (snaps.length < 2) return 0
    const previous = parseFloat(snaps[1].net_worth)
    if (previous === 0) return 0
    return ((parseFloat(snaps[0].net_worth) - previous) / previous) * 100
  },

  getTrendDirection: (): "up" | "down" | "flat" => {
    const change = get().getNetWorthChange()
    if (change > 0) return "up"
    if (change < 0) return "down"
    return "flat"
  },

  getLatestSummary: () => {
    const summaries = get().summaries
    return summaries.length > 0 ? summaries[0] : null
  },

  getSummaryByMonth: (year: number, month: number) =>
    get().summaries.find(
      (s) => s.cycle_year === year && s.cycle_month === month
    ) ?? null,

  // ── Utilities ──────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}))
