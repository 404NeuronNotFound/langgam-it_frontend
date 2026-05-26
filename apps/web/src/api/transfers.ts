// src/api/transfers.ts
//
// Transfer API calls — all fund money movements.
//
// Endpoints:
//   GET  /api/transfers/            → getTransfers
//   POST /api/transfers/            → createTransfer
//   POST /api/transfers/add-money/  → addMoney
//
// Transfer types:
//   cash_to_fund    Cash on Hand → any fund (save extra)
//   fund_to_cash    any fund → Cash on Hand (withdraw to spend)
//   fund_to_fund    any fund → any other fund (rebalance)
//   external_add    external → Cash on Hand (sold something, bonus)
//   income_allocation income → fund (monthly distribution, read-only)
//   goal_completed  closed fund → Cash on Hand (auto on fund close)
//   survival_draw   Emergency Fund → Cash on Hand (zero income month)
//   month_end_carry leftover income → Cash on Hand (monthly engine)

import { apiClient } from "./client"
import type {
  Transfer,
  TransferCreatePayload,
  TransferResponse,
  AddMoneyPayload,
} from "../types"

// ── Local query param type ────────────────────────────────────────────
interface TransferListParams {
  fund?: number
  type?: string
  limit?: number
}

// ── 1. Get transfer history ───────────────────────────────────────────
export async function getTransfers(
  params?: TransferListParams
): Promise<Transfer[]> {
  const { data } = await apiClient.get<Transfer[]>("/transfers/", {
    params: {
      ...(params?.fund !== undefined && { fund: params.fund }),
      ...(params?.type !== undefined && { type: params.type }),
      ...(params?.limit !== undefined && { limit: params.limit }),
    },
  })
  return data
}

// ── 2. Create manual transfer ─────────────────────────────────────────
export async function createTransfer(
  payload: TransferCreatePayload
): Promise<TransferResponse> {
  const body: Record<string, unknown> = {
    to_fund_id: payload.to_fund_id,
    amount: payload.amount,
    transfer_type: payload.transfer_type,
  }
  if (payload.from_fund_id !== undefined) {
    body.from_fund_id = payload.from_fund_id
  }
  if (payload.note !== undefined) {
    body.note = payload.note
  }
  if (payload.date !== undefined) {
    body.date = payload.date
  }

  const { data } = await apiClient.post<TransferResponse>("/transfers/", body)
  return data
}

// ── 3. Add external money to Cash on Hand ─────────────────────────────
export async function addMoney(
  payload: AddMoneyPayload
): Promise<TransferResponse> {
  const body: Record<string, unknown> = {
    amount: payload.amount,
    note: payload.note,
  }
  if (payload.date !== undefined) {
    body.date = payload.date
  }

  const { data } = await apiClient.post<TransferResponse>(
    "/transfers/add-money/",
    body
  )
  return data
}
