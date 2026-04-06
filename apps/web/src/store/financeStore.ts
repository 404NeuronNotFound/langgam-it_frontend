// Zustand store for financial data

import { create } from "zustand";
import type { FinancialProfile, NetWorthSnapshot, FinancialProfileUpdate } from "@/types/finance";
import {
  getFinancialProfile,
  updateFinancialProfile,
  getNetWorthSnapshots,
} from "@/api/finance";

interface FinanceState {
  profile: FinancialProfile | null;
  snapshots: NetWorthSnapshot[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: FinancialProfileUpdate) => Promise<void>;
  fetchSnapshots: () => Promise<void>;
  isSetupComplete: () => boolean;
  reset: () => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  profile: null,
  snapshots: [],
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await getFinancialProfile();
      set({ profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch profile", isLoading: false });
    }
  },

  updateProfile: async (data: FinancialProfileUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await updateFinancialProfile(data);
      // Backend automatically creates snapshot when profile is updated
      set({ profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to update profile", isLoading: false });
    }
  },

  fetchSnapshots: async () => {
    set({ isLoading: true, error: null });
    try {
      const snapshots = await getNetWorthSnapshots();
      set({ snapshots, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch snapshots", isLoading: false });
    }
  },

  isSetupComplete: (): boolean => {
    const { profile } = useFinanceStore.getState();
    if (!profile) return false;
    
    // Check if any bucket has a value > 0
    const hasValues: boolean = 
      parseFloat(profile.emergency_fund) > 0 ||
      parseFloat(profile.savings) > 0 ||
      parseFloat(profile.rigs_fund) > 0 ||
      parseFloat(profile.cash_on_hand) > 0 ||
      parseFloat(profile.investments_total) > 0;
    
    return hasValues;
  },

  reset: () => {
    set({ profile: null, snapshots: [], isLoading: false, error: null });
  },
}));
