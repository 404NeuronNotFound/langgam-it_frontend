import { create } from "zustand"

interface NetWorthStoreState {
  reset: () => void
}

export const useNetWorthStore = create<NetWorthStoreState>(() => ({
  reset: () => {},
}))
