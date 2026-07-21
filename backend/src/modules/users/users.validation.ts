import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().min(1).max(60).optional(),
  currency: z.string().min(1).max(10).optional(),
  measurementUnit: z.enum(['metric', 'imperial']).optional(),
  notifyEmail: z.boolean().optional(),
  notifyInApp: z.boolean().optional(),
  dailySummaryEnabled: z.boolean().optional(),
  weeklyReportEnabled: z.boolean().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
})
