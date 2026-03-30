// API functions for expenses and daily limit

import { apiClient } from "./client";
import type { Expense, ExpenseCreate, DailyLimit } from "@/types/expense";

// Create a new expense
export async function createExpense(data: ExpenseCreate): Promise<any> {
  console.log("API: Creating expense", data);
  try {
    const response = await apiClient.post("/expenses/", data);
    console.log("API: Expense created", response.data);
    // Backend returns {expense, profile, cycle, alerts}
    return response.data;
  } catch (error: any) {
    console.error("API: Expense creation failed", error.response?.data);
    throw error;
  }
}

// Get list of expenses (with optional date filter)
export async function getExpenses(date?: string): Promise<Expense[]> {
  const params = date ? { date } : {};
  const response = await apiClient.get("/expenses/list/", { params });
  return response.data;
}

// Get expenses for a specific cycle
export async function getExpensesByCycle(cycleId: number): Promise<Expense[]> {
  const response = await apiClient.get(`/expenses/cycle/${cycleId}/`);
  return response.data;
}

// Get today's expenses
export async function getTodayExpenses(): Promise<Expense[]> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return getExpenses(today);
}

// Get daily limit information
export async function getDailyLimit(): Promise<DailyLimit> {
  const response = await apiClient.get("/expenses/daily-limit/");
  return response.data;
}
