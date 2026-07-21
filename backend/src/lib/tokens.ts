import crypto from 'node:crypto'

/** Generates a URL-safe random token plus its SHA-256 hash for storage. Never store the raw token. */
export function generateSecureToken() {
  const raw = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

export function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}
