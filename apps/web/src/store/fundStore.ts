import { create } from "zustand"

interface FundStoreState {
  fetchFunds: () => Promise<void>
  reset: () => void
}

export const useFundStore = create<FundStoreState>(() => ({
  fetchFunds: async () => {},
  reset: () => {},
}))
