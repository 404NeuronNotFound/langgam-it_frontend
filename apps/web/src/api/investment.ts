// api/investment.ts

import { apiClient } from "./client";
import type { Investment, InvestmentCreate, InvestmentUpdate } from "../types/investment";

// ── Investments CRUD ──────────────────────────────────────────────────────────

export async function getInvestments(): Promise<Investment[]> {
  const { data } = await apiClient.get<Investment[]>("/investments/");
  return data;
}

export async function createInvestment(payload: InvestmentCreate): Promise<Investment> {
  const { data } = await apiClient.post<Investment>("/investments/", payload);
  return data;
}

export async function updateInvestment(id: number, payload: InvestmentUpdate): Promise<Investment> {
  const { data } = await apiClient.patch<Investment>(`/investments/${id}/`, payload);
  return data;
}

export async function deleteInvestment(id: number): Promise<void> {
  await apiClient.delete(`/investments/${id}/`);
}

// ── Transfer between savings and investments ───────────────────────────────

export async function investFromSavings(amount: number): Promise<{ profile: object }> {
  const { data } = await apiClient.post("/invest/", { amount });
  return data;
}

export async function divestToSavings(amount: number): Promise<{ profile: object }> {
  const { data } = await apiClient.post("/divest/", { amount });
  return data;
}