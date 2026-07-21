import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { env } from '../config/env.js'

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR)
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, name)
  },
})

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])

export const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Unsupported file type. Use JPEG, PNG, WEBP, or HEIC.'))
    }
    cb(null, true)
  },
})

/**
 * Returns the public URL for an uploaded file served from local disk.
 * NOTE: swap this for a Cloudinary upload call once CLOUDINARY_* env vars are set -
 * the rest of the app only depends on getting back a URL string, so the change is isolated here.
 */
export function localFileUrl(filename: string) {
  return `/uploads/${filename}`
}
