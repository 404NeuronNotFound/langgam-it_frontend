// API functions for financial profile and net worth snapshots

import { apiClient } from "./client";
import type {
  FinancialProfile,
  FinancialProfileUpdate,
  NetWorthSnapshot,
} from "@/types/finance";

// Get or create financial profile
export async function getFinancialProfile(): Promise<FinancialProfile> {
  const response = await apiClient.get("/finance/profile/");
  return response.data;
}

// Update financial profile (buckets + currency)
// Backend automatically creates snapshot when profile is updated
export async function updateFinancialProfile(
  data: FinancialProfileUpdate
): Promise<FinancialProfile> {
  const response = await apiClient.patch("/finance/profile/", data);
  return response.data;
}

// Get net worth snapshots (newest first)
export async function getNetWorthSnapshots(): Promise<NetWorthSnapshot[]> {
  const response = await apiClient.get("/finance/snapshots/");
  return response.data;
}
