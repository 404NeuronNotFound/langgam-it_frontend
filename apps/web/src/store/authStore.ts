// store/authStore.ts
//
// Zustand store managing authentication state.
// Persists access_token and refresh_token to localStorage
// so the user stays logged in across page refreshes.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AxiosError } from "axios";

import { login as apiLogin, logoutCleanup, getMe } from "../api/auth";
import type { AuthState, LoginPayload, APIError, User } from "../types/auth";

// ── Helper: extract a readable error message from DRF errors ──────
function parseError(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as APIError | undefined;
    if (!data) return "Network error. Please try again.";

    // DRF returns { detail: "..." } for generic errors (e.g. bad credentials)
    if (data.detail) return data.detail;

    // Field-level errors: { username: ["already taken"], email: ["..."] }
    const fieldErrors = Object.entries(data)
      .map(([field, messages]) => {
        const msg = Array.isArray(messages) ? messages[0] : messages;
        return `${field}: ${msg}`;
      })
      .join(" ");

    return fieldErrors || "Something went wrong.";
  }
  return "Unexpected error. Please try again.";
}

// ── Store actions interface ───────────────────────────────────────
interface AuthActions {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  hydrateUser: () => Promise<void>;
  clearError: () => void;
}

// ── Zustand store ─────────────────────────────────────────────────
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // ── Initial state ──────────────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Login ──────────────────────────────────────────────────
      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null });
        try {
          const data = await apiLogin(payload);

          // Persist tokens to localStorage so the axios interceptor can read them
          localStorage.setItem("access_token", data.access);
          localStorage.setItem("refresh_token", data.refresh);

          set({
            user: data.user,
            accessToken: data.access,
            refreshToken: data.refresh,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            isAuthenticated: false,
            error: parseError(error),
          });
          throw error; // re-throw so the form can react if needed
        }
      },

      // ── Logout ─────────────────────────────────────────────────
      logout: () => {
        logoutCleanup();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // ── Hydrate user on app boot ───────────────────────────────
      // Call this in your root layout / App.tsx on mount.
      // If a valid access token exists it fetches the latest user data.
      hydrateUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;

        try {
          const user: User = await getMe();
          set({ user, isAuthenticated: true });
        } catch {
          // Token is expired or invalid — clean up
          logoutCleanup();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      // ── Clear error ────────────────────────────────────────────
      clearError: () => set({ error: null }),
    }),
    {
      name: "langgam-it-auth",          // localStorage key
      partialize: (state) => ({         // only persist tokens + user, not UI state
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        user:         state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);