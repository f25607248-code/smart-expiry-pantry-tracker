import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { generateSecret, generateURI, verify } from 'otplib'
import { env } from '../config/env.js'

const APP_NAME = 'Smart Pantry Tracker'
const RECOVERY_CODE_COUNT = 10

/**
 * Derived from JWT_ACCESS_SECRET (sha256, distinct suffix) rather than a dedicated env var, so
 * enabling 2FA doesn't require provisioning and deploying a separate secret on top of what's
 * already configured.
 */
function encryptionKey() {
  return crypto.createHash('sha256').update(`${env.JWT_ACCESS_SECRET}:totp-secret-encryption`).digest()
}

export function generateTotpSecret() {
  return generateSecret()
}

export function buildOtpauthUrl(email: string, secret: string) {
  return generateURI({ issuer: APP_NAME, label: email, secret })
}

export async function verifyTotpToken(secret: string, token: string) {
  const result = await verify({ secret, token: token.trim(), epochTolerance: 30 })
  return result.valid
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decryptSecret(ciphertext: string): string {
  const [ivHex, authTagHex, dataHex] = ciphertext.split(':')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase()
    return `${raw.slice(0, 5)}-${raw.slice(5)}`
  })
}

export function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)))
}

/** Matches a raw recovery code against stored hashes; returns the matched hash (so the caller can remove it — single use) or null. */
export async function matchRecoveryCode(code: string, hashedCodes: string[]): Promise<string | null> {
  for (const hash of hashedCodes) {
    if (await bcrypt.compare(code, hash)) return hash
  }
  return null
}
