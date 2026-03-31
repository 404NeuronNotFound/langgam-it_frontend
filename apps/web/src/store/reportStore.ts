// Zustand store for reports

import { create } from "zustand";
import type { ReportData, MonthSummary } from "@/types/report";
import { getReports, closeMonth } from "@/api/report";

interface ReportState {
  reportData: ReportData | null;
  monthSummary: MonthSummary | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchReports: () => Promise<void>;
  closeCurrentMonth: () => Promise<MonthSummary>;
  reset: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  reportData: null,
  monthSummary: null,
  isLoading: false,
  error: null,

  fetchReports: async () => {
    set({ isLoading: true, error: null });
    try {
      const reportData = await getReports();
      console.log("Reports data received:", reportData);
      set({ reportData, isLoading: false });
    } catch (error: any) {
      console.error("Failed to fetch reports:", error);
      set({ error: error.message || "Failed to fetch reports", isLoading: false });
    }
  },

  closeCurrentMonth: async () => {
    set({ isLoading: true, error: null });
    try {
      const monthSummary = await closeMonth();
      set({ monthSummary, isLoading: false });
      return monthSummary;
    } catch (error: any) {
      set({ error: error.message || "Failed to close month", isLoading: false });
      throw error;
    }
  },

  reset: () => {
    set({
      reportData: null,
      monthSummary: null,
      isLoading: false,
      error: null,
    });
  },
}));
