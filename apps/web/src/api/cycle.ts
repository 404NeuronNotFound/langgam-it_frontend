// API functions for monthly cycle and allocation

import { apiClient } from "./client";
import type {
  MonthCycle,
  AllocationLog,
  IncomeSubmission,
  InvestmentSubmission,
  AllocationResult,
} from "@/types/cycle";

// Get current active cycle
export async function getCurrentCycle(): Promise<MonthCycle | null> {
  try {
    const response = await apiClient.get("/cycle/current/");
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

// Get allocation logs for a cycle
export async function getAllocationLogs(cycleId: number): Promise<AllocationLog[]> {
  const response = await apiClient.get(`/cycle/${cycleId}/logs/`);
  return response.data;
}

// Submit income and trigger allocation engine
export async function submitIncome(data: IncomeSubmission): Promise<AllocationResult> {
  console.log("API: Submitting income to /income/", data);
  const response = await apiClient.post("/income/", data);
  console.log("API: Income response", response.data);
  return response.data;
}

// Move savings to investments
export async function submitInvestment(data: InvestmentSubmission): Promise<AllocationResult> {
  const response = await apiClient.post("/invest/", data);
  return response.data;
}

// Get all cycles (for history)
export async function getAllCycles(): Promise<MonthCycle[]> {
  const response = await apiClient.get("/cycle/");
  return response.data;
}

// Reset expenses for current cycle
export async function resetCycleExpenses(): Promise<any> {
  const response = await apiClient.post("/cycle/reset-expenses/");
  return response.data;
}
