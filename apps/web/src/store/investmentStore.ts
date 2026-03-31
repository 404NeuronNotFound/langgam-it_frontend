// Zustand store for investments

import { create } from "zustand";
import type { Investment, InvestmentCreate, InvestmentUpdate } from "@/types/investment";
import {
  getInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from "@/api/investment";
import { useFinanceStore } from "./financeStore";

interface InvestmentState {
  investments: Investment[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchInvestments: () => Promise<void>;
  addInvestment: (data: InvestmentCreate) => Promise<Investment>;
  editInvestment: (id: number, data: InvestmentUpdate) => Promise<Investment>;
  removeInvestment: (id: number) => Promise<void>;
  reset: () => void;
}

export const useInvestmentStore = create<InvestmentState>((set) => ({
  investments: [],
  isLoading: false,
  error: null,

  fetchInvestments: async () => {
    set({ isLoading: true, error: null });
    try {
      const investments = await getInvestments();
      set({ investments, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch investments", isLoading: false });
    }
  },

  addInvestment: async (data: InvestmentCreate) => {
    set({ isLoading: true, error: null });
    try {
      const investment = await createInvestment(data);
      set((state) => ({
        investments: [investment, ...state.investments],
        isLoading: false,
      }));
      
      // Refresh profile to sync investments_total
      await useFinanceStore.getState().fetchProfile();
      
      return investment;
    } catch (error: any) {
      set({ error: error.message || "Failed to add investment", isLoading: false });
      throw error;
    }
  },

  editInvestment: async (id: number, data: InvestmentUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateInvestment(id, data);
      set((state) => ({
        investments: state.investments.map((inv) => (inv.id === id ? updated : inv)),
        isLoading: false,
      }));
      
      // Refresh profile to sync investments_total
      await useFinanceStore.getState().fetchProfile();
      
      return updated;
    } catch (error: any) {
      set({ error: error.message || "Failed to update investment", isLoading: false });
      throw error;
    }
  },

  removeInvestment: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await deleteInvestment(id);
      set((state) => ({
        investments: state.investments.filter((inv) => inv.id !== id),
        isLoading: false,
      }));
      
      // Refresh profile to sync investments_total
      await useFinanceStore.getState().fetchProfile();
    } catch (error: any) {
      set({ error: error.message || "Failed to delete investment", isLoading: false });
      throw error;
    }
  },

  reset: () => {
    set({
      investments: [],
      isLoading: false,
      error: null,
    });
  },
}));
