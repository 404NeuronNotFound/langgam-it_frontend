// src/api/auth.ts
//
// Authentication API calls.
// All functions return typed data or throw AxiosError.
// Error parsing is handled by the calling store, not here.
//
// Endpoints:
//   POST /api/auth/token/          → login
//   POST /api/auth/register/       → register
//   GET  /api/auth/me/             → getMe
//   POST /api/auth/token/refresh/  → refreshToken (plain axios)
//   —    (client-side only)        → logout

import axios from "axios"
import { apiClient } from "./client"
import { clearTokens } from "./client"
import type { User, AuthTokens, LoginPayload, RegisterPayload } from "../types"

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"
).replace(/\/$/, "")

// ── 1. Login ──────────────────────────────────────────────────────────
export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>("/auth/token/", payload)
  return data
}

// ── 2. Register ───────────────────────────────────────────────────────
export async function register(
  payload: RegisterPayload,
): Promise<{ message: string; user: User }> {
  const { data } = await apiClient.post<{ message: string; user: User }>(
    "/auth/register/",
    payload,
  )
  return data
}

// ── 3. Get current user ───────────────────────────────────────────────
export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me/")
  return data
}

// ── 4. Refresh token (plain axios — bypasses interceptor) ─────────────
export async function refreshToken(
  refresh: string,
): Promise<{ access: string }> {
  const { data } = await axios.post<{ access: string }>(
    `${BASE_URL}/auth/token/refresh/`,
    { refresh },
  )
  return data
}

// ── 5. Logout (client-side only) ──────────────────────────────────────
export function logout(): void {
  clearTokens()
}
