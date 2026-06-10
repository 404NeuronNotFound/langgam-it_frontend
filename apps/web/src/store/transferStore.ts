import { create } from "zustand"
import {
  getTransfers,
  createTransfer,
  addMoney,
} from "../api/transfers"
import type {
  Transfer,
  TransferCreatePayload,
  TransferResponse,
  AddMoneyPayload,
  TransferState,
  AccountProfile,
  TransferType,
} from "../types"

// ── Local types ───────────────────────────────────────────────────────
interface TransferFetchParams {
  fund?: number
  type?: string
  limit?: number
}

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const res = (error as any).response
    if (typeof res?.data?.detail === "string") return res.data.detail
    if (typeof res?.data?.error === "string") return res.data.error
    if (res?.status === 400) {
      // DRF may return field-level errors
      if (res.data?.amount) return `Amount: ${res.data.amount}`
      if (res.data?.note) return `Note: ${res.data.note}`
      if (res.data?.transfer_type)
        return `Transfer type: ${res.data.transfer_type}`
      return res.data?.error ?? "Invalid transfer request."
    }
    if (res?.status === 404) return "Fund not found."
  }
  return "Something went wrong. Please try again."
}

// ── Store shape ───────────────────────────────────────────────────────
interface TransferStore extends TransferState {
  // Actions
  fetchTransfers: (params?: TransferFetchParams) => Promise<void>
  fetchFundTransfers: (fundId: number) => Promise<void>
  createTransfer: (
    payload: TransferCreatePayload
  ) => Promise<TransferResponse>
  addMoney: (payload: AddMoneyPayload) => Promise<TransferResponse>
  prependTransfer: (transfer: Transfer) => void
  syncFromProfile: (profile: AccountProfile) => void

  // Computed getters
  getTransfersByType: (type: TransferType) => Transfer[]
  getManualTransfers: () => Transfer[]
  getByFund: (fundId: number) => Transfer[]
  getRecentTransfers: (limit: number) => Transfer[]

  clearError: () => void
  reset: () => void
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState = {
  transfers: [] as Transfer[],
  isLoading: false,
  error: null as string | null,
}

// ── Store ─────────────────────────────────────────────────────────────
export const useTransferStore = create<TransferStore>()((set, get) => ({
  ...initialState,

  // ── Async actions ──────────────────────────────────────────────────

  fetchTransfers: async (params?: TransferFetchParams) => {
    set({ isLoading: true, error: null })
    try {
      const transfers = await getTransfers(params)
      set({ transfers, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  fetchFundTransfers: async (fundId: number) => {
    set({ isLoading: true, error: null })
    try {
      const transfers = await getTransfers({ fund: fundId })
      set({ transfers, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
    }
  },

  createTransfer: async (payload: TransferCreatePayload) => {
    set({ isLoading: true, error: null })
    try {
      const response = await createTransfer(payload)
      set((state) => ({
        transfers: [response.transfer, ...state.transfers],
        isLoading: false,
      }))

      // Sync fund balances
      const { useFundStore } = await import("./fundStore")
      useFundStore.getState().syncFromProfile(response.profile)

      // Sync cycle
      const { useCycleStore } = await import("./cycleStore")
      useCycleStore.getState().syncFromProfile(response.profile)

      // Update net worth
      const { useNetWorthStore } = await import("./netWorthStore")
      useNetWorthStore.getState().setCurrentNetWorth(response.profile.net_worth)

      return response
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  addMoney: async (payload: AddMoneyPayload) => {
    set({ isLoading: true, error: null })
    try {
      const response = await addMoney(payload)
      set((state) => ({
        transfers: [response.transfer, ...state.transfers],
        isLoading: false,
      }))

      // Sync fund balances
      const { useFundStore } = await import("./fundStore")
      useFundStore.getState().syncFromProfile(response.profile)

      // Sync cycle
      const { useCycleStore } = await import("./cycleStore")
      useCycleStore.getState().syncFromProfile(response.profile)

      // Update net worth
      const { useNetWorthStore } = await import("./netWorthStore")
      useNetWorthStore.getState().setCurrentNetWorth(response.profile.net_worth)

      return response
    } catch (error) {
      set({ isLoading: false, error: _parseError(error) })
      throw error
    }
  },

  // ── Sync actions ──────────────────────────────────────────────────

  prependTransfer: (transfer: Transfer) => {
    set((state) => ({
      transfers: [transfer, ...state.transfers],
    }))
  },

  syncFromProfile: (profile: AccountProfile) => {
    // No-op for now
    void profile
  },

  // ── Computed getters ───────────────────────────────────────────────

  getTransfersByType: (type: TransferType) =>
    get().transfers.filter((t) => t.transfer_type === type),

  getManualTransfers: () =>
    get().transfers.filter((t) =>
      ["cash_to_fund", "fund_to_cash", "fund_to_fund", "external_add"].includes(
        t.transfer_type
      )
    ),

  getByFund: (fundId: number) =>
    get().transfers.filter(
      (t) => t.from_fund_id === fundId || t.to_fund_id === fundId
    ),

  getRecentTransfers: (limit: number) => get().transfers.slice(0, limit),

  // ── Utilities ──────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}))
