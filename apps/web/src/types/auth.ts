// types/auth.ts

// ── User ──────────────────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  date_joined?: string;
}

// ── Auth state (used in Zustand store) ───────────────────────────
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ── Request payloads ─────────────────────────────────────────────
export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

// ── API responses ────────────────────────────────────────────────
export interface TokenResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface RefreshResponse {
  access: string;
}

// ── API error shape from Django REST Framework ───────────────────
export interface APIError {
  detail?: string;
  [field: string]: string | string[] | undefined;
}