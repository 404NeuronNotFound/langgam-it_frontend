// API functions for investments

import { apiClient } from "./client";
import type { Investment, InvestmentCreate, InvestmentUpdate } from "@/types/investment";

// Get all investments
export async function getInvestments(): Promise<Investment[]> {
  const response = await apiClient.get("/investments/");
  return response.data;
}

// Create a new investment
export async function createInvestment(data: InvestmentCreate): Promise<Investment> {
  const response = await apiClient.post("/investments/", data);
  return response.data;
}

// Update an investment
export async function updateInvestment(id: number, data: InvestmentUpdate): Promise<Investment> {
  const response = await apiClient.patch(`/investments/${id}/`, data);
  return response.data;
}

// Delete an investment
export async function deleteInvestment(id: number): Promise<void> {
  await apiClient.delete(`/investments/${id}/`);
}
