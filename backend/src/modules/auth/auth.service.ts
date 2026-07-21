import bcrypt from 'bcryptjs'
import * as QRCode from 'qrcode'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../lib/apiError.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken, signTwoFactorPendingToken, verifyTwoFactorPendingToken } from '../../lib/jwt.js'
import { generateSecureToken, hashToken } from '../../lib/tokens.js'
import { sendMail, verificationEmailTemplate, passwordResetEmailTemplate } from '../../lib/mailer.js'
import {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotpToken,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
  matchRecoveryCode,
} from '../../lib/twoFactor.js'
import { env, isGoogleLoginConfigured } from '../../config/env.js'
import crypto from 'node:crypto'

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID)

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function toPublicUser(user: {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: string
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  theme: string
  language: string
  timezone: string
  currency: string
  measurementUnit: string
  notifyEmail: boolean
  notifyInApp: boolean
  dailySummaryEnabled: boolean
  weeklyReportEnabled: boolean
  createdAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    theme: user.theme,
    language: user.language,
    timezone: user.timezone,
    currency: user.currency,
    measurementUnit: user.measurementUnit,
    notifyEmail: user.notifyEmail,
    notifyInApp: user.notifyInApp,
    dailySummaryEnabled: user.dailySummaryEnabled,
    weeklyReportEnabled: user.weeklyReportEnabled,
    createdAt: user.createdAt,
  }
}

async function issueTokenPair(userId: string, email: string, role: 'USER' | 'ADMIN') {
  const accessToken = signAccessToken({ sub: userId, email, role })

  const jti = crypto.randomUUID()
  const refreshToken = signRefreshToken({ sub: userId, jti })
  const tokenHash = hashToken(refreshToken)

  await prisma.refreshToken.create({
    data: {
      id: jti,
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  })

  return { accessToken, refreshToken }
}

export async function register(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw ApiError.conflict('An account with this email already exists')

  const passwordHash = await bcrypt.hash(input.password, 12)
  const { raw, hash } = generateSecureToken()

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      emailVerificationToken: hash,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  const verifyUrl = `${env.CLIENT_URL}/verify-email/${raw}`
  await sendMail({
    to: user.email,
    subject: 'Verify your email — Smart Pantry Tracker',
    html: verificationEmailTemplate(user.name, verifyUrl),
  })

  const tokens = await issueTokenPair(user.id, user.email, user.role)
  return { user: toPublicUser(user), ...tokens }
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid email or password')

  const valid = await bcrypt.compare(input.password, user.passwordHash)
  if (!valid) throw ApiError.unauthorized('Invalid email or password')

  if (user.twoFactorEnabled) {
    const pendingToken = signTwoFactorPendingToken({ sub: user.id })
    return { requiresTwoFactor: true as const, pendingToken }
  }

  const tokens = await issueTokenPair(user.id, user.email, user.role)
  return { requiresTwoFactor: false as const, user: toPublicUser(user), ...tokens }
}

export async function loginWithGoogle(idToken: string) {
  if (!isGoogleLoginConfigured) throw ApiError.notImplemented('Google sign-in requires GOOGLE_CLIENT_ID to be set in the backend .env file.')

  let payload
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    payload = ticket.getPayload()
  } catch {
    throw ApiError.unauthorized('Invalid Google sign-in token')
  }
  if (!payload?.email || !payload.email_verified) {
    throw ApiError.unauthorized('Your Google account has no verified email')
  }

  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email: payload.email }] } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name ?? payload.email.split('@')[0],
        avatarUrl: payload.picture ?? null,
        googleId: payload.sub,
        isEmailVerified: true,
      },
    })
  } else if (user.googleId !== payload.sub) {
    // First Google sign-in for an account that previously only had a password — link them by email.
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub, isEmailVerified: true } })
  }

  if (user.twoFactorEnabled) {
    const pendingToken = signTwoFactorPendingToken({ sub: user.id })
    return { requiresTwoFactor: true as const, pendingToken }
  }

  const tokens = await issueTokenPair(user.id, user.email, user.role)
  return { requiresTwoFactor: false as const, user: toPublicUser(user), ...tokens }
}

/** Shared by login-completion and disable — accepts either a 6-digit TOTP code or a single-use recovery code. */
async function verifyTwoFactorCode(user: { twoFactorSecret: string | null; twoFactorRecoveryCodes: string[] }, rawCode: string) {
  const code = rawCode.trim()
  if (!user.twoFactorSecret) return { valid: false as const }

  if (/^\d{6}$/.test(code)) {
    const valid = await verifyTotpToken(decryptSecret(user.twoFactorSecret), code)
    return { valid }
  }

  const matchedHash = await matchRecoveryCode(code.toUpperCase(), user.twoFactorRecoveryCodes)
  return { valid: Boolean(matchedHash), usedRecoveryCodeHash: matchedHash ?? undefined }
}

export async function completeTwoFactorLogin(pendingTokenRaw: string, code: string) {
  let payload
  try {
    payload = verifyTwoFactorPendingToken(pendingTokenRaw)
  } catch {
    throw ApiError.unauthorized('Your session expired — please log in again')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.twoFactorEnabled) {
    throw ApiError.unauthorized('Two-factor authentication is not set up for this account')
  }

  const { valid, usedRecoveryCodeHash } = await verifyTwoFactorCode(user, code)
  if (!valid) throw ApiError.unauthorized('Invalid verification code')

  if (usedRecoveryCodeHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((hash) => hash !== usedRecoveryCodeHash) },
    })
  }

  const tokens = await issueTokenPair(user.id, user.email, user.role)
  return { user: toPublicUser(user), ...tokens }
}

export async function setupTwoFactor(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.notFound('User not found')
  if (user.twoFactorEnabled) throw ApiError.conflict('Two-factor authentication is already enabled')

  const secret = generateTotpSecret()
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: encryptSecret(secret) } })

  const otpauthUrl = buildOtpauthUrl(user.email, secret)
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)
  return { secret, otpauthUrl, qrCodeDataUrl }
}

export async function confirmTwoFactor(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.notFound('User not found')
  if (user.twoFactorEnabled) throw ApiError.conflict('Two-factor authentication is already enabled')
  if (!user.twoFactorSecret) throw ApiError.badRequest('Start setup first to get a QR code')

  const valid = await verifyTotpToken(decryptSecret(user.twoFactorSecret), token)
  if (!valid) throw ApiError.badRequest('Invalid verification code')

  const recoveryCodes = generateRecoveryCodes()
  const hashedCodes = await hashRecoveryCodes(recoveryCodes)

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true, twoFactorRecoveryCodes: hashedCodes },
  })

  return { recoveryCodes }
}

export async function disableTwoFactor(userId: string, password: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.notFound('User not found')
  if (!user.twoFactorEnabled) throw ApiError.conflict('Two-factor authentication is not enabled')
  if (!user.passwordHash) throw ApiError.badRequest('This account signed in with Google and has no password set')

  const validPassword = await bcrypt.compare(password, user.passwordHash)
  if (!validPassword) throw ApiError.unauthorized('Incorrect password')

  const { valid } = await verifyTwoFactorCode(user, token)
  if (!valid) throw ApiError.badRequest('Invalid verification code')

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
  })
}

export async function regenerateRecoveryCodes(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.notFound('User not found')
  if (!user.twoFactorEnabled) throw ApiError.conflict('Two-factor authentication is not enabled')
  if (!user.passwordHash) throw ApiError.badRequest('This account signed in with Google and has no password set')

  const validPassword = await bcrypt.compare(password, user.passwordHash)
  if (!validPassword) throw ApiError.unauthorized('Incorrect password')

  const recoveryCodes = generateRecoveryCodes()
  const hashedCodes = await hashRecoveryCodes(recoveryCodes)
  await prisma.user.update({ where: { id: userId }, data: { twoFactorRecoveryCodes: hashedCodes } })

  return { recoveryCodes }
}

export async function refresh(refreshTokenRaw: string) {
  let payload
  try {
    payload = verifyRefreshToken(refreshTokenRaw)
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token')
  }

  const tokenHash = hashToken(refreshTokenRaw)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.id !== payload.jti) {
    throw ApiError.unauthorized('Invalid or expired refresh token')
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } })
  if (!user) throw ApiError.unauthorized('User no longer exists')

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
  const tokens = await issueTokenPair(user.id, user.email, user.role)
  return { user: toPublicUser(user), ...tokens }
}

export async function logout(refreshTokenRaw: string | undefined) {
  if (!refreshTokenRaw) return
  const tokenHash = hashToken(refreshTokenRaw)
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: tokenHash, emailVerificationExpires: { gt: new Date() } },
  })
  if (!user) throw ApiError.badRequest('Invalid or expired verification link')

  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerificationToken: null, emailVerificationExpires: null },
  })
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.isEmailVerified) return

  const { raw, hash } = generateSecureToken()
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificationToken: hash, emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  })

  const verifyUrl = `${env.CLIENT_URL}/verify-email/${raw}`
  await sendMail({
    to: user.email,
    subject: 'Verify your email — Smart Pantry Tracker',
    html: verificationEmailTemplate(user.name, verifyUrl),
  })
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return // Do not reveal whether the account exists

  const { raw, hash } = generateSecureToken()
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: hash, passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) },
  })

  const resetUrl = `${env.CLIENT_URL}/reset-password/${raw}`
  await sendMail({
    to: user.email,
    subject: 'Reset your password — Smart Pantry Tracker',
    html: passwordResetEmailTemplate(user.name, resetUrl),
  })
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken)
  const user = await prisma.user.findFirst({
    where: { passwordResetToken: tokenHash, passwordResetExpires: { gt: new Date() } },
  })
  if (!user) throw ApiError.badRequest('Invalid or expired reset link')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
  })

  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.notFound('User not found')
  return toPublicUser(user)
}
