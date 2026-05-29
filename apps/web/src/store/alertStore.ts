import { create } from "zustand"
import {
  getAlerts,
  markAlertRead,
} from "../api/alerts"
import type {
  Alert,
  AlertState,
  AlertType,
} from "../types"

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as any).response
    if (typeof res?.data?.detail === "string") return res.data.detail
    if (typeof res?.data?.error === "string") return res.data.error
    if (res?.status === 404) return "Alert not found."
  }
  return "Something went wrong. Please try again."
}

// ── Store shape ───────────────────────────────────────────────────────
interface AlertStore extends AlertState {
  // Actions
  fetchAlerts: () => Promise<void>
  fetchAllAlerts: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
  addAlerts: (newAlerts: Alert[]) => void

  // Computed getters
  getUnreadAlerts: () => Alert[]
  getAlertsByType: (type: AlertType) => Alert[]
  hasUnread: () => boolean
  getUnreadCountCapped: () => string
  getLatestUnread: () => Alert | null
  getLatestUnreadByType: (type: AlertType) => Alert | null

  clearError: () => void
  reset: () => void
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState = {
  alerts: [] as Alert[],
  unreadCount: 0,
  isLoading: false,
  error: null as string | null,
}

// ── Store ─────────────────────────────────────────────────────────────
export const useAlertStore = create<AlertStore>()((set, get) => ({
  ...initialState,

  // ── Async actions ──────────────────────────────────────────────────

  fetchAlerts: async () => {
    set({ isLoading: true, error: null })
    try {
      const alerts = await getAlerts()
      set({
        alerts,
        unreadCount: alerts.filter((a) => !a.is_read).length,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  fetchAllAlerts: async () => {
    set({ isLoading: true, error: null })
    try {
      const alerts = await getAlerts({ all: true })
      set({
        alerts,
        unreadCount: alerts.filter((a) => !a.is_read).length,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  markRead: async (id: number) => {
    try {
      const updated = await markAlertRead(id)
      set((state) => {
        const alerts = state.alerts.map((a) => (a.id === id ? updated : a))
        return {
          alerts,
          unreadCount: alerts.filter((a) => !a.is_read).length,
        }
      })
    } catch (error) {
      // Non-fatal — markRead fails silently
    }
  },

  markAllRead: async () => {
    set({ isLoading: true })
    const unread = get().alerts.filter((a) => !a.is_read)
    try {
      const results = await Promise.allSettled(
        unread.map((a) => markAlertRead(a.id))
      )

      // Collect successfully updated alerts
      const updatedMap = new Map<number, Alert>()
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          updatedMap.set(result.value.id, result.value)
        }
      })

      set((state) => {
        const alerts = state.alerts.map((a) =>
          updatedMap.has(a.id) ? updatedMap.get(a.id)! : a
        )
        return {
          alerts,
          unreadCount: alerts.filter((a) => !a.is_read).length,
          isLoading: false,
        }
      })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  // ── Sync actions ──────────────────────────────────────────────────

  addAlerts: (newAlerts: Alert[]) => {
    if (newAlerts.length === 0) return

    set((state) => {
      const existingIds = new Set(state.alerts.map((a) => a.id))
      const fresh = newAlerts.filter((a) => !existingIds.has(a.id))

      if (fresh.length === 0) return state

      const alerts = [...fresh, ...state.alerts]
      return {
        alerts,
        unreadCount: alerts.filter((a) => !a.is_read).length,
      }
    })
  },

  // ── Computed getters ───────────────────────────────────────────────

  getUnreadAlerts: () => get().alerts.filter((a) => !a.is_read),

  getAlertsByType: (type: AlertType) =>
    get().alerts.filter((a) => a.type === type),

  hasUnread: () => get().unreadCount > 0,

  getUnreadCountCapped: () => {
    const count = get().unreadCount
    if (count === 0) return ""
    if (count > 9) return "9+"
    return String(count)
  },

  getLatestUnread: () => {
    const unread = get().alerts.filter((a) => !a.is_read)
    return unread.length > 0 ? unread[0] : null
  },

  getLatestUnreadByType: (type: AlertType) => {
    const unread = get().alerts.filter((a) => !a.is_read && a.type === type)
    return unread.length > 0 ? unread[0] : null
  },

  // ── Utilities ──────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}))
