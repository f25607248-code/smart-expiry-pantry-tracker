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

/**
 * Verifies a real login access token and rejects anything else that happens to be signed with
 * the same secret family (e.g. a shopping-list share token) - without this shape check, a token
 * with no `sub` would decode successfully and downstream code would silently query with
 * userId: undefined, which Prisma treats as "no filter" rather than "no match".
 */
export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload & jwt.JwtPayload
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Token is not a valid access token')
  }
  return payload
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

/**
 * Signed with a secret derived from (but distinct from) JWT_ACCESS_SECRET, for the same reason as
 * the 2FA-pending token above: a shopping-list share link must never be acceptable to
 * verifyAccessToken, or it would pass requireAuth on every route with no `sub` claim, and
 * downstream Prisma queries built from `where: { userId: req.user.sub }` would silently drop the
 * userId filter entirely (Prisma treats an undefined filter value as "not specified").
 */
const SHARE_LINK_SECRET = crypto.createHash('sha256').update(`${env.JWT_ACCESS_SECRET}:share-link`).digest('hex')

export type ShareLinkPayload = { listId: string; type: 'shopping-list-share' }

export function signShareLinkToken(payload: ShareLinkPayload) {
  return jwt.sign(payload, SHARE_LINK_SECRET, { expiresIn: '30d' })
}

export function verifyShareLinkToken(token: string) {
  const payload = jwt.verify(token, SHARE_LINK_SECRET) as ShareLinkPayload & jwt.JwtPayload
  if (payload.type !== 'shopping-list-share' || typeof payload.listId !== 'string') {
    throw new Error('Token is not a valid share link token')
  }
  return payload
}
