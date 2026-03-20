// store/registerStore.ts
//
// Zustand store for the registration flow.
// After successful registration, it auto-logs the user in using
// the authStore so the user lands on /dashboard seamlessly —
// OR it can just redirect to "/" (login) with a success flag,
// depending on what the page requests.

import { create } from "zustand";
import { AxiosError } from "axios";

import { register as apiRegister } from "../api/auth";
import type { APIError, RegisterPayload } from "../types/auth";

// ── Error parser (same as authStore) ─────────────────────────────
function parseError(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as APIError | undefined;
    if (!data) return "Network error. Please try again.";
    if (data.detail) return data.detail;

    // Field-level errors from DRF: { username: ["already taken"] }
    const messages = Object.entries(data)
      .map(([field, val]) => {
        const msg = Array.isArray(val) ? val[0] : val;
        // Capitalise field name for readability
        const label = field.replace(/_/g, " ");
        return `${label}: ${msg}`;
      })
      .join("  •  ");

    return messages || "Something went wrong. Please try again.";
  }
  return "Unexpected error. Please try again.";
}

// ── Store shape ───────────────────────────────────────────────────
interface RegisterState {
  isLoading: boolean;
  isSuccess: boolean;      // true after a successful registration
  error: string | null;
}

interface RegisterActions {
  register: (payload: RegisterPayload) => Promise<void>;
  clearError: () => void;
  resetSuccess: () => void;
}

// ── Store ─────────────────────────────────────────────────────────
export const useRegisterStore = create<RegisterState & RegisterActions>()(
  (set) => ({
    isLoading: false,
    isSuccess: false,
    error: null,

    register: async (payload: RegisterPayload) => {
      set({ isLoading: true, error: null, isSuccess: false });
      try {
        await apiRegister(payload);
        set({ isLoading: false, isSuccess: true });
      } catch (error) {
        set({
          isLoading: false,
          isSuccess: false,
          error: parseError(error),
        });
        throw error;
      }
    },

    clearError: () => set({ error: null }),
    resetSuccess: () => set({ isSuccess: false }),
  })
);