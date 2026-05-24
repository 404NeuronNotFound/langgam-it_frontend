import { apiClient } from "./client"
import type {
  Fund,
  FundCreatePayload,
  FundUpdatePayload,
  AllocationSuggestion,
} from "../types"

type CloseFundResponse = {
  message: string
  fund: Fund
  transferred: string
}

type SetupBalancesResponse = {
  message: string
  net_worth: string
  funds: Fund[]
}

// ── 1. Get all funds ──────────────────────────────────────────────────
export async function getFunds(): Promise<Fund[]> {
  const { data } = await apiClient.get<Fund[]>("/funds/")
  return data
}

// ── 2. Create goal fund ───────────────────────────────────────────────
export async function createFund(payload: FundCreatePayload): Promise<Fund> {
  const { data } = await apiClient.post<Fund>("/funds/", payload)
  return data
}

// ── 3. Get single fund ────────────────────────────────────────────────
export async function getFund(id: number): Promise<Fund> {
  const { data } = await apiClient.get<Fund>(`/funds/${id}/`)
  return data
}

// ── 4. Update fund ────────────────────────────────────────────────────
export async function updateFund(
  id: number,
  payload: FundUpdatePayload,
): Promise<Fund> {
  const { data } = await apiClient.patch<Fund>(`/funds/${id}/`, payload)
  return data
}

// ── 5. Reorder funds ──────────────────────────────────────────────────
export async function reorderFunds(order: number[]): Promise<Fund[]> {
  const { data } = await apiClient.post<Fund[]>("/funds/reorder/", { order })
  return data
}

// ── 6. Close fund ─────────────────────────────────────────────────────
export async function closeFund(
  id: number,
  note: string,
): Promise<CloseFundResponse> {
  const { data } = await apiClient.post<CloseFundResponse>(
    `/funds/${id}/close/`,
    { note },
  )
  return data
}

// ── 7. Allocation suggestion ──────────────────────────────────────────
export async function getAllocationSuggestion(): Promise<AllocationSuggestion> {
  const { data } = await apiClient.get<AllocationSuggestion>(
    "/funds/allocation-suggestion/",
  )
  return data
}

// ── 8. Setup balances ─────────────────────────────────────────────────
export async function setupBalances(
  balances: Record<number, number>,
): Promise<SetupBalancesResponse> {
  const body = {
    balances: Object.fromEntries(
      Object.entries(balances).map(([id, amount]) => [id, String(amount)]),
    ),
  }
  const { data } = await apiClient.post<SetupBalancesResponse>(
    "/setup/balances/",
    body,
  )
  return data
}
