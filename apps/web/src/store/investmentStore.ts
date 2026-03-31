// store/investmentStore.ts
//
// Manages individual Investment records AND keeps FinancialProfile.investments_total
// in sync after every create / update / delete.
//
// Flow:
//   User adds an Investment
//     → POST /api/investments/  (Django auto-syncs investments_total via sync_investments_total)
//     → fetchProfile() re-reads the updated FinancialProfile from the backend
//     → UI shows the new totals everywhere

import { create } from "zustand";
import type { Investment, InvestmentCreate, InvestmentUpdate } from "../types/investment";
import {
  getInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  investFromSavings,
  divestToSavings,
} from "../api/investment";

// ── Lazy import helper to avoid circular deps ─────────────────────────────────
// financeStore imports nothing from investmentStore so this is safe.
async function syncProfile() {
  const { useFinanceStore } = await import("./financeStore");
  await useFinanceStore.getState().fetchProfile();
}

// ── Store shape ────────────────────────────────────────────────────────────────

interface InvestmentState {
  investments: Investment[];
  isLoading: boolean;
  error: string | null;

  fetchInvestments: () => Promise<void>;
  addInvestment: (data: InvestmentCreate) => Promise<Investment>;
  editInvestment: (id: number, data: InvestmentUpdate) => Promise<Investment>;
  removeInvestment: (id: number) => Promise<void>;

  // Transfer between savings ↔ investments (updates FinancialProfile buckets)
  transferToInvestments: (amount: number) => Promise<void>;
  transferToSavings: (amount: number) => Promise<void>;

  clearError: () => void;
  reset: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useInvestmentStore = create<InvestmentState>((set) => ({
  investments: [],
  isLoading: false,
  error: null,

  // ── Fetch ──────────────────────────────────────────────────────────────────
  fetchInvestments: async () => {
    set({ isLoading: true, error: null });
    try {
      const investments = await getInvestments();
      set({ investments, isLoading: false });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || "Failed to fetch investments.", isLoading: false });
    }
  },

  // ── Add ────────────────────────────────────────────────────────────────────
  // When an Investment is created the backend calls profile.sync_investments_total()
  // so FinancialProfile.investments_total becomes the sum of all Investment.current_value.
  // We re-fetch the profile so the Dashboard and setup wizard both reflect the new total.
  addInvestment: async (data: InvestmentCreate) => {
    set({ isLoading: true, error: null });
    try {
      const investment = await createInvestment(data);
      set((state) => ({
        investments: [investment, ...state.investments],
        isLoading: false,
      }));
      await syncProfile(); // keeps FinancialProfile.investments_total up to date
      return investment;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to add investment.";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // ── Edit ───────────────────────────────────────────────────────────────────
  editInvestment: async (id: number, data: InvestmentUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateInvestment(id, data);
      set((state) => ({
        investments: state.investments.map((inv) => (inv.id === id ? updated : inv)),
        isLoading: false,
      }));
      await syncProfile();
      return updated;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to update investment.";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // ── Remove ─────────────────────────────────────────────────────────────────
  removeInvestment: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await deleteInvestment(id);
      set((state) => ({
        investments: state.investments.filter((inv) => inv.id !== id),
        isLoading: false,
      }));
      await syncProfile();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to delete investment.";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // ── Transfer savings → investments ─────────────────────────────────────────
  // Calls POST /api/invest/ which moves money between FinancialProfile buckets.
  // Does NOT create an Investment record — the user should add that manually
  // via addInvestment() to track what they bought.
  transferToInvestments: async (amount: number) => {
    set({ isLoading: true, error: null });
    try {
      await investFromSavings(amount);
      await syncProfile();
      set({ isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Transfer failed.";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // ── Transfer investments → savings ─────────────────────────────────────────
  // Calls POST /api/divest/
  transferToSavings: async (amount: number) => {
    set({ isLoading: true, error: null });
    try {
      await divestToSavings(amount);
      await syncProfile();
      set({ isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Transfer failed.";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({ investments: [], isLoading: false, error: null }),
}));