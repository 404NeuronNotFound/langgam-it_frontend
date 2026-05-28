// src/store/authStore.ts
//
// Authentication store — manages user, JWT tokens,
// login, logout, and app boot hydration.
//
// Boot sequence:
//   1. App.tsx mounts
//   2. hydrateUser() called
//   3. If token exists → GET /api/auth/me/ → set user
//   4. accountStore.fetchSetupStatus() called next
//   5. Route guard checks isAuthenticated + setup_complete

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  login as apiLogin,
  register as apiRegister,
  getMe,
  logout as apiLogout,
} from "../api/auth"
import {
  REFRESH_TOKEN_KEY,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  getAccessToken,
} from "../api/client"
import type {
  User,
  AuthState,
  LoginPayload,
  RegisterPayload,
} from "../types"

// ── Private helpers ───────────────────────────────────────────────────
function _parseError(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as any).response
    if (response?.data) {
      const data = response.data
      // DRF returns errors as { detail: "..." }
      // or { field: ["error msg"] } for validation errors
      if (typeof data.detail === "string") return data.detail
      // Join field errors for login/register
      const messages = Object.values(data)
        .flat()
        .filter((v): v is string => typeof v === "string")
      if (messages.length > 0) return messages[0]
    }
    if (response?.status === 401) return "Invalid username or password."
    if (response?.status === 400) return "Please check your input and try again."
  }
  return "Something went wrong. Please try again."
}

interface AuthStore extends AuthState {
  login:        (payload: LoginPayload) => Promise<void>
  register:     (payload: RegisterPayload) => Promise<{ message: string; user: User }>
  logout:       () => void
  hydrateUser:  () => Promise<void>
  clearError:   () => void
  setTokens:    (access: string, refresh: string) => void
}

// ── Store ─────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({

      // ── Initial state ──────────────────────────────────────────────
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      // ── Actions ────────────────────────────────────────────────────
      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null })

        try {
          const data = await apiLogin(payload)
          // Store tokens in localStorage via client helpers
          setAccessToken(data.access)
          setRefreshToken(data.refresh)

          set({
            user:            data.user,
            accessToken:     data.access,
            refreshToken:    data.refresh,
            isAuthenticated: true,
            isLoading:       false,
            error:           null,
          })
        } catch (error) {
          set({
            isLoading:       false,
            isAuthenticated: false,
            error:           _parseError(error),
          })
          throw error
        }
      },

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true, error: null })

        try {
          const data = await apiRegister(payload)
          set({ isLoading: false, error: null })
          return data
        } catch (error) {
          set({
            isLoading: false,
            error:     _parseError(error),
          })
          throw error
        }
      },

      logout: () => {
        // 1. Clear localStorage tokens via client helper
        apiLogout() // calls clearTokens() from client.ts

        // 2. Clear all auth state in Zustand
        set({
          user:            null,
          accessToken:     null,
          refreshToken:    null,
          isAuthenticated: false,
          isLoading:       false,
          error:           null,
        })

        // 3. Clear other stores — lazy import to avoid circular deps
        //    Each store exposes a reset() action
        import("./accountStore").then(({ useAccountStore }) =>
          useAccountStore.getState().reset()
        ).catch(() => {})
        import("./fundStore").then(({ useFundStore }) =>
          useFundStore.getState().reset()
        ).catch(() => {})
        import("./cycleStore").then(({ useCycleStore }) =>
          useCycleStore.getState().reset()
        ).catch(() => {})
        import("./expenseStore").then(({ useExpenseStore }) =>
          useExpenseStore.getState().reset()
        ).catch(() => {})
        import("./alertStore").then(({ useAlertStore }) =>
          useAlertStore.getState().reset()
        ).catch(() => {})
        import("./transferStore").then(({ useTransferStore }) =>
          useTransferStore.getState().reset()
        ).catch(() => {})
        import("./netWorthStore").then(({ useNetWorthStore }) =>
          useNetWorthStore.getState().reset()
        ).catch(() => {})
        import("./budgetStore").then(({ useBudgetStore }) =>
          useBudgetStore.getState().reset()
        ).catch(() => {})
      },

      hydrateUser: async () => {
        const accessToken = getAccessToken()

        if (!accessToken) {
          // No token — user is not logged in
          set({
            isAuthenticated: false,
            isLoading:       false,
          })
          return
        }

        // Token exists — try to get fresh user data
        set({ isLoading: true })

        try {
          const user = await getMe()
          set({
            user:            user,
            accessToken:     accessToken,
            refreshToken:    localStorage.getItem(REFRESH_TOKEN_KEY),
            isAuthenticated: true,
            isLoading:       false,
            error:           null,
          })
        } catch (error) {
          // Token is invalid or expired and refresh failed
          // (interceptor already tried to refresh before this threw)
          clearTokens()
          set({
            user:            null,
            accessToken:     null,
            refreshToken:    null,
            isAuthenticated: false,
            isLoading:       false,
            error:           null,
          })
        }
      },

      setTokens: (access: string, refresh: string) => {
        setAccessToken(access)
        setRefreshToken(refresh)
        set({ accessToken: access, refreshToken: refresh })
      },

      clearError: () => set({ error: null }),

    }),
    {
      name: "langgam-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist the token strings and auth flag
      partialize: (state) => ({
        accessToken:     state.accessToken,
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
