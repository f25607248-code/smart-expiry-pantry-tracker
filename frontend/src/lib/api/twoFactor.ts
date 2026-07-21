import { api } from '@/lib/axios'

export type TwoFactorSetup = {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

export async function setupTwoFactor() {
  const { data } = await api.post<TwoFactorSetup>('/auth/2fa/setup')
  return data
}

export async function confirmTwoFactor(code: string) {
  const { data } = await api.post<{ recoveryCodes: string[] }>('/auth/2fa/confirm', { code })
  return data.recoveryCodes
}

export async function disableTwoFactor(password: string, code: string) {
  await api.post('/auth/2fa/disable', { password, code })
}

export async function regenerateRecoveryCodes(password: string) {
  const { data } = await api.post<{ recoveryCodes: string[] }>('/auth/2fa/recovery-codes/regenerate', { password })
  return data.recoveryCodes
}
