import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../lib/apiError.js'

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  isEmailVerified: true,
  twoFactorEnabled: true,
  theme: true,
  language: true,
  timezone: true,
  currency: true,
  measurementUnit: true,
  notifyEmail: true,
  notifyInApp: true,
  dailySummaryEnabled: true,
  weeklyReportEnabled: true,
  createdAt: true,
} as const

export async function updateProfile(userId: string, data: Record<string, unknown>) {
  return prisma.user.update({ where: { id: userId }, data, select: PUBLIC_USER_SELECT })
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl }, select: PUBLIC_USER_SELECT })
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw ApiError.notFound('User not found')

  // Google-only accounts have no password yet — this doubles as "set a password" for them, since
  // requireAuth already proves the caller owns the account (no current password to check against).
  if (user.passwordHash) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw ApiError.unauthorized('Current password is incorrect')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
}
