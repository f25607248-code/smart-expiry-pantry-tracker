import type { ExpiryStatus } from '@/types'

export const EXPIRY_STATUS_CONFIG: Record<ExpiryStatus, { label: string; badgeVariant: 'fresh' | 'soon' | 'urgent' | 'expired' }> = {
  FRESH: { label: 'Fresh', badgeVariant: 'fresh' },
  SOON: { label: 'Expiring soon', badgeVariant: 'soon' },
  URGENT: { label: 'Expiring very soon', badgeVariant: 'urgent' },
  EXPIRED: { label: 'Expired', badgeVariant: 'expired' },
}

export function formatDaysRemaining(daysRemaining: number) {
  if (daysRemaining < 0) return `Expired ${Math.abs(daysRemaining)}d ago`
  if (daysRemaining === 0) return 'Expires today'
  if (daysRemaining === 1) return 'Expires tomorrow'
  return `${daysRemaining} days left`
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function toDateInputValue(dateString: string) {
  return new Date(dateString).toISOString().slice(0, 10)
}
