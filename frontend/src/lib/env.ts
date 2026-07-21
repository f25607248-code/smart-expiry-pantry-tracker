/**
 * Base origin for the backend API, e.g. "https://your-backend.onrender.com".
 * Empty by default so local dev keeps using Vite's /api and /uploads proxy (see vite.config.ts).
 * Set VITE_API_URL in a deployed environment (Netlify, etc.) that has no such proxy.
 */
export const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

/** OAuth 2.0 Client ID for "Sign in with Google" (Google Identity Services). Unset until configured — the button hides itself when empty. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

/** Resolves a backend-relative path (e.g. "/uploads/xyz.png") against API_ORIGIN when set. Already-absolute URLs (http(s), blob, data) pass through unchanged. */
export function resolveBackendUrl(path: string) {
  if (/^(https?:|blob:|data:)/.test(path)) return path
  return `${API_ORIGIN}${path}`
}
