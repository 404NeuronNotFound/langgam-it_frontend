// Zustand store for monthly cycle and allocation

import { create } from "zustand";
import type { MonthCycle, AllocationLog, AllocationResult } from "@/types/cycle";
import {
  getCurrentCycle,
  getAllocationLogs,
  submitIncome,
  submitInvestment,
  getAllCycles,
} from "@/api/cycle";

interface CycleState {
  currentCycle: MonthCycle | null;
  allocationLogs: AllocationLog[];
  allCycles: MonthCycle[];
  isLoading: boolean;
  error: string | null;
  lastAllocationResult: AllocationResult | null;

  // Actions
  fetchCurrentCycle: () => Promise<void>;
  fetchAllocationLogs: (cycleId: number) => Promise<void>;
  fetchAllCycles: () => Promise<void>;
  addIncome: (amount: number) => Promise<AllocationResult>;
  moveToInvestments: (amount: number) => Promise<AllocationResult>;
  reset: () => void;
}

export const useCycleStore = create<CycleState>((set) => ({
  currentCycle: null,
  allocationLogs: [],
  allCycles: [],
  isLoading: false,
  error: null,
  lastAllocationResult: null,

  fetchCurrentCycle: async () => {
    set({ isLoading: true, error: null });
    try {
      const cycle = await getCurrentCycle();
      set({ currentCycle: cycle, isLoading: false });
    } catch (error: any) {
      // 404 is expected when no cycle exists yet - not an error
      if (error.response?.status === 404) {
        set({ currentCycle: null, isLoading: false });
      } else {
        set({ error: error.message || "Failed to fetch cycle", isLoading: false });
      }
    }
  },

  fetchAllocationLogs: async (cycleId: number) => {
    set({ isLoading: true, error: null });
    try {
      const logs = await getAllocationLogs(cycleId);
      set({ allocationLogs: logs, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch logs", isLoading: false });
    }
  },

  fetchAllCycles: async () => {
    set({ isLoading: true, error: null });
    try {
      const cycles = await getAllCycles();
      set({ allCycles: cycles, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch cycles", isLoading: false });
    }
  },

  addIncome: async (amount: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await submitIncome({ amount });
      set({
        currentCycle: result.cycle,
        allocationLogs: result.logs,
        lastAllocationResult: result,
        isLoading: false,
      });
      return result;
    } catch (error: any) {
      set({ error: error.message || "Failed to submit income", isLoading: false });
      throw error;
    }
  },

  moveToInvestments: async (amount: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await submitInvestment({ amount });
      set({
        currentCycle: result.cycle,
        allocationLogs: [...useCycleStore.getState().allocationLogs, ...result.logs],
        lastAllocationResult: result,
        isLoading: false,
      });
      return result;
    } catch (error: any) {
      set({ error: error.message || "Failed to move to investments", isLoading: false });
      throw error;
    }
  },

  reset: () => {
    set({
      currentCycle: null,
      allocationLogs: [],
      allCycles: [],
      isLoading: false,
      error: null,
      lastAllocationResult: null,
    });
  },
}));
