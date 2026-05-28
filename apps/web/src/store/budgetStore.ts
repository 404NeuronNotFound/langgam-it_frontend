import { create } from "zustand"

interface BudgetStoreState {
  reset: () => void
}

export const useBudgetStore = create<BudgetStoreState>(() => ({
  reset: () => {},
}))
