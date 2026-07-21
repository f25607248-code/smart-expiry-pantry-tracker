import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
})

export const verifyEmailParamsSchema = z.object({
  token: z.string().min(1),
})

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
})

export const twoFactorLoginSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().trim().min(6).max(11),
})

export const twoFactorConfirmSchema = z.object({
  code: z.string().trim().length(6, 'Enter the 6-digit code from your authenticator app'),
})

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().trim().min(6).max(11),
})

export const twoFactorRecoveryCodesSchema = z.object({
  password: z.string().min(1),
})
