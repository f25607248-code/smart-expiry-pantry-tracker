import axios from 'axios'
import { API_ORIGIN } from '@/lib/env'
import type { User } from '@/types'

let accessToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

type RefreshResult = { accessToken: string; user: User }

let refreshPromise: Promise<RefreshResult | null> | null = null

async function performRefresh(): Promise<RefreshResult | null> {
  try {
    const { data } = await axios.post<RefreshResult>(`${API_ORIGIN}/api/auth/refresh`, {}, { withCredentials: true })
    setAccessToken(data.accessToken)
    return data
  } catch {
    setAccessToken(null)
    return null
  }
}

/**
 * Single-flight silent refresh: concurrent callers (e.g. React StrictMode's double-invoked
 * effects, or several requests 401-ing at once) share one in-flight request instead of racing
 * separate POSTs against a single-use, rotating refresh token — the loser of that race would
 * otherwise 401 and clobber state that the winner had just set.
 */
export function silentRefresh(): Promise<RefreshResult | null> {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true

      const result = await silentRefresh()
      if (result) {
        originalRequest.headers.Authorization = `Bearer ${result.accessToken}`
        return api(originalRequest)
      }

      onUnauthorized?.()
    }

    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallback
  }
  return fallback
}
