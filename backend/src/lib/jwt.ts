import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { env } from '../config/env.js'

export type AccessTokenPayload = {
  sub: string
  email: string
  role: 'USER' | 'ADMIN'
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload & jwt.JwtPayload
}

export type RefreshTokenPayload = {
  sub: string
  jti: string
}

export function signRefreshToken(payload: RefreshTokenPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & jwt.JwtPayload
}

/**
 * Signed with a secret derived from (but distinct from) JWT_ACCESS_SECRET, so a pending-2FA
 * token can never accidentally verify as a real access token via verifyAccessToken — the login
 * isn't complete until the second factor is checked, and this token must not grant API access.
 */
const TWO_FACTOR_PENDING_SECRET = crypto.createHash('sha256').update(`${env.JWT_ACCESS_SECRET}:2fa-pending`).digest('hex')

export type TwoFactorPendingPayload = { sub: string }

export function signTwoFactorPendingToken(payload: TwoFactorPendingPayload) {
  return jwt.sign(payload, TWO_FACTOR_PENDING_SECRET, { expiresIn: '5m' })
}

export function verifyTwoFactorPendingToken(token: string) {
  return jwt.verify(token, TWO_FACTOR_PENDING_SECRET) as TwoFactorPendingPayload & jwt.JwtPayload
}
