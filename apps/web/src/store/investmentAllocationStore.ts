// store/investmentAllocationStore.ts
// Manages investment allocation state and syncing

import { create } from "zustand";
import type { InvestmentAllocation } from "@/api/investmentAllocation";
import {
  getInvestmentAllocation,
  updateInvestmentAllocation,
} from "@/api/investmentAllocation";

interface InvestmentAllocationState {
  allocation: InvestmentAllocation | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAllocation: () => Promise<void>;
  updateAllocation: (amount: number) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useInvestmentAllocationStore = create<InvestmentAllocationState>((set) => ({
  allocation: null,
  isLoading: false,
  error: null,

  fetchAllocation: async () => {
    set({ isLoading: true, error: null });
    try {
      const allocation = await getInvestmentAllocation();
      set({ allocation, isLoading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.detail || "Failed to fetch allocation.",
        isLoading: false,
      });
    }
  },

  updateAllocation: async (amount: number) => {
    set({ isLoading: true, error: null });
    try {
      const allocation = await updateInvestmentAllocation(amount);
      set({ allocation, isLoading: false });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to update allocation.";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({ allocation: null, isLoading: false, error: null }),
}));
