// Zustand store for expenses and daily limit

import { create } from "zustand";
import type { Expense, ExpenseCreate, DailyLimit } from "@/types/expense";
import {
  createExpense,
  getExpenses,
  getExpensesByCycle,
  getTodayExpenses,
  getDailyLimit,
} from "@/api/expense";

interface ExpenseState {
  expenses: Expense[];
  todayExpenses: Expense[];
  dailyLimit: DailyLimit | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchExpenses: (date?: string) => Promise<void>;
  fetchExpensesByCycle: (cycleId: number) => Promise<void>;
  fetchTodayExpenses: () => Promise<void>;
  fetchDailyLimit: () => Promise<void>;
  addExpense: (data: ExpenseCreate) => Promise<Expense>;
  reset: () => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  todayExpenses: [],
  dailyLimit: null,
  isLoading: false,
  error: null,

  fetchExpenses: async (date?: string) => {
    set({ isLoading: true, error: null });
    try {
      const expenses = await getExpenses(date);
      set({ expenses, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch expenses", isLoading: false });
    }
  },

  fetchExpensesByCycle: async (cycleId: number) => {
    set({ isLoading: true, error: null });
    try {
      const expenses = await getExpensesByCycle(cycleId);
      set({ expenses, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch expenses", isLoading: false });
    }
  },

  fetchTodayExpenses: async () => {
    set({ isLoading: true, error: null });
    try {
      const todayExpenses = await getTodayExpenses();
      set({ todayExpenses, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch today's expenses", isLoading: false });
    }
  },

  fetchDailyLimit: async () => {
    set({ isLoading: true, error: null });
    try {
      const dailyLimit = await getDailyLimit();
      set({ dailyLimit, isLoading: false });
    } catch (error: any) {
      // 404 is expected when no cycle exists yet
      if (error.response?.status === 404) {
        set({ dailyLimit: null, isLoading: false });
      } else {
        set({ error: error.message || "Failed to fetch daily limit", isLoading: false });
      }
    }
  },

  addExpense: async (data: ExpenseCreate) => {
    set({ isLoading: true, error: null });
    try {
      const response = await createExpense(data);
      
      // Backend returns {expense, profile, cycle, alerts}
      const expense = response.expense || response;
      
      // Add to today's expenses if it's today
      const today = new Date().toISOString().split("T")[0];
      const expenseDate = expense?.date ? expense.date.split("T")[0] : today;
      
      if (expenseDate === today) {
        set((state) => ({
          todayExpenses: [expense, ...state.todayExpenses],
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
      
      // Refresh daily limit after adding expense
      get().fetchDailyLimit();
      
      return expense;
    } catch (error: any) {
      set({ error: error.message || "Failed to add expense", isLoading: false });
      throw error;
    }
  },

  reset: () => {
    set({
      expenses: [],
      todayExpenses: [],
      dailyLimit: null,
      isLoading: false,
      error: null,
    });
  },
}));
