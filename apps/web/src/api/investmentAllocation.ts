// api/investmentAllocation.ts
// Handles investment allocation tracking and syncing

import { apiClient } from "./client";

export interface InvestmentAllocation {
  total_allocated: string;      // Total from setup wizard
  total_current_value: string;  // Sum of all current_value
  total_profit_loss: string;    // total_current_value - total_invested
  profit_loss_percentage: string;
  is_balanced: boolean;         // true if sum of investments = total_allocated
}

// Get current investment allocation status
export async function getInvestmentAllocation(): Promise<InvestmentAllocation> {
  const { data } = await apiClient.get<InvestmentAllocation>("/investments/allocation/");
  return data;
}

// Update investment allocation (when transferring from savings)
export async function updateInvestmentAllocation(amount: number): Promise<InvestmentAllocation> {
  const { data } = await apiClient.patch<InvestmentAllocation>("/investments/allocation/", {
    amount,
  });
  return data;
}
