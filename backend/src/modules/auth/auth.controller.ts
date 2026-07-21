import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ApiError } from '../../lib/apiError.js'
import { env } from '../../config/env.js'
import { param } from '../../lib/params.js'
import * as authService from './auth.service.js'

const REFRESH_COOKIE = 'refreshToken'
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000

// In production the frontend (Netlify) and backend (Railway) are on different domains, so this
// cookie is cross-site: SameSite=Lax is NOT sent on cross-site fetch/XHR (only top-level
// navigations), which would silently break refresh/login persistence. SameSite=None requires
// Secure, which is fine since both are HTTPS. Locally frontend/backend share an effective origin
// via Vite's dev proxy, so Lax (no HTTPS required) is simpler there.
function setRefreshCookie(res: Response, token: string) {
  const isProd = env.NODE_ENV === 'production'
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  })
}

function clearRefreshCookie(res: Response) {
  const isProd = env.NODE_ENV === 'production'
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth', secure: isProd, sameSite: isProd ? 'none' : 'lax' })
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body)
  setRefreshCookie(res, refreshToken)
  res.status(201).json({ user, accessToken })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body)

  if (result.requiresTwoFactor) {
    res.status(200).json({ requiresTwoFactor: true, pendingToken: result.pendingToken })
    return
  }

  setRefreshCookie(res, result.refreshToken)
  res.status(200).json({ requiresTwoFactor: false, user: result.user, accessToken: result.accessToken })
})

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginWithGoogle(req.body.idToken)

  if (result.requiresTwoFactor) {
    res.status(200).json({ requiresTwoFactor: true, pendingToken: result.pendingToken })
    return
  }

  setRefreshCookie(res, result.refreshToken)
  res.status(200).json({ requiresTwoFactor: false, user: result.user, accessToken: result.accessToken })
})

export const twoFactorLogin = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.completeTwoFactorLogin(req.body.pendingToken, req.body.code)
  setRefreshCookie(res, refreshToken)
  res.status(200).json({ user, accessToken })
})

export const setupTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.setupTwoFactor(req.user!.sub)
  res.status(200).json(data)
})

export const confirmTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.confirmTwoFactor(req.user!.sub, req.body.code)
  res.status(200).json(data)
})

export const disableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  await authService.disableTwoFactor(req.user!.sub, req.body.password, req.body.code)
  res.status(200).json({ message: 'Two-factor authentication disabled' })
})

export const regenerateRecoveryCodes = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.regenerateRecoveryCodes(req.user!.sub, req.body.password)
  res.status(200).json(data)
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE]
  if (!token) throw ApiError.unauthorized('Missing refresh token')

  const { user, accessToken, refreshToken } = await authService.refresh(token)
  setRefreshCookie(res, refreshToken)
  res.status(200).json({ user, accessToken })
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE]
  await authService.logout(token)
  clearRefreshCookie(res)
  res.status(204).send()
})

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(param(req, 'token'))
  res.status(200).json({ message: 'Email verified successfully' })
})

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  await authService.resendVerification(req.body.email)
  res.status(200).json({ message: 'If an account exists, a verification email has been sent' })
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email)
  res.status(200).json({ message: 'If an account exists, a reset link has been sent' })
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password)
  res.status(200).json({ message: 'Password reset successfully' })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.sub)
  res.status(200).json({ user })
})
