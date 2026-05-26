// src/api/client.ts

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

// ── Config ────────────────────────────────────────────────────────────
const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"
).replace(/\/$/, "")

// ── Axios instance ────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Render free tier can cold-start after inactivity; 15s is a practical limit.
  timeout: 15000,
})

// ── localStorage keys ─────────────────────────────────────────────────
export const ACCESS_TOKEN_KEY = "langgam_access_token"
export const REFRESH_TOKEN_KEY = "langgam_refresh_token"

// ── Token helpers ─────────────────────────────────────────────────────
function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// ── Refresh queue ─────────────────────────────────────────────────────
type QueueEntry = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let failedQueue: QueueEntry[] = []

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else if (token) resolve(token)
  })
  failedQueue = []
}

// ── Lazy store helpers ────────────────────────────────────────────────
async function _syncStoreAccessToken(newToken: string): Promise<void> {
  try {
    const { useAuthStore } = await import("../store/authStore")
    useAuthStore.setState({ accessToken: newToken })
  } catch {
    // Store sync failure is non-fatal; localStorage is the source of truth.
  }
}

async function _logoutAndRedirect(): Promise<void> {
  try {
    const { useAuthStore } = await import("../store/authStore")
    useAuthStore.getState().logout()
  } catch {
    // Ignore store cleanup failures; token storage is cleared separately.
  }
  window.location.href = "/"
}

// ── Request interceptor ───────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ──────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (!originalRequest) {
      return Promise.reject(error)
    }

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("auth/token/refresh/")
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      processQueue(error, null)
      clearTokens()
      void _logoutAndRedirect()
      isRefreshing = false
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post<{ access: string }>(
        `${BASE_URL}/auth/token/refresh/`,
        { refresh: refreshToken }
      )

      const newAccessToken = data.access
      setAccessToken(newAccessToken)
      void _syncStoreAccessToken(newAccessToken)
      processQueue(null, newAccessToken)

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearTokens()
      void _logoutAndRedirect()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
export {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
}
