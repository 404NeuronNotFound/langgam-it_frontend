// api/auth.ts
//
// All auth-related API calls.
// Each function returns typed data or throws an AxiosError
// that the store/component can catch and surface to the user.

import { apiClient } from "./client";
import type {
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  TokenResponse,
  User,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from "../types/auth";

// ── Login ─────────────────────────────────────────────────────────
// POST /api/auth/token/
// Returns access token, refresh token, and basic user info.

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>(
    "/auth/token/",
    payload
  );
  return data;
}

// ── Register ──────────────────────────────────────────────────────
// POST /api/auth/register/
// Creates a new account. Does NOT return tokens — call login() after.

export async function register(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>(
    "/auth/register/",
    payload
  );
  return data;
}

// ── Get current user ──────────────────────────────────────────────
// GET /api/auth/me/
// Requires a valid access token (attached automatically by the interceptor).

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me/");
  return data;
}

// ── Logout (client-side only) ─────────────────────────────────────
// Simple JWT has no server-side logout endpoint by default.
// Tokens are cleared from localStorage; the refresh token becomes
// invalid after its lifetime (1 day) or if blacklisting is enabled.

export function logoutCleanup(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// ── Update profile ────────────────────────────────────────────────
// PATCH /api/auth/profile/
// Updates user profile (first_name, last_name, email).

export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<User> {
  const { data } = await apiClient.patch<User>("/auth/profile/", payload);
  return data;
}

// ── Change password ───────────────────────────────────────────────
// POST /api/auth/change-password/
// Changes user password. Requires old_password for verification.

export async function changePassword(
  payload: ChangePasswordPayload
): Promise<{ detail: string }> {
  const { data } = await apiClient.post<{ detail: string }>(
    "/auth/change-password/",
    payload
  );
  return data;
}