import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().default('http://localhost:4000'),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('Smart Pantry Tracker'),
  SMTP_FROM_EMAIL: z.string().optional(),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(5),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  SPOONACULAR_API_KEY: z.string().optional(),
  BARCODE_LOOKUP_API_KEY: z.string().optional(),
  GOOGLE_VISION_API_KEY: z.string().optional(),

  EXPIRY_CHECK_CRON: z.string().default('0 8 * * *'),
  WEEKLY_REPORT_CRON: z.string().default('0 8 * * 1'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment configuration')
}

export const env = parsed.data

export const isEmailConfigured = Boolean(env.SMTP_USER && env.SMTP_PASSWORD)
export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
)
export const isGoogleLoginConfigured = Boolean(env.GOOGLE_CLIENT_ID)
export const isOpenAiConfigured = Boolean(env.OPENAI_API_KEY)
export const isGeminiConfigured = Boolean(env.GEMINI_API_KEY)
export const isSpoonacularConfigured = Boolean(env.SPOONACULAR_API_KEY)
export const isBarcodeLookupConfigured = Boolean(env.BARCODE_LOOKUP_API_KEY)
export const isGoogleVisionConfigured = Boolean(env.GOOGLE_VISION_API_KEY)
