export type ExpiryStatus = 'FRESH' | 'SOON' | 'URGENT' | 'EXPIRED'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Days remaining until expiry, counted in whole calendar days (negative once expired). */
export function daysUntil(expiryDate: Date, now = new Date()) {
  return Math.ceil((startOfDay(expiryDate).getTime() - startOfDay(now).getTime()) / DAY_MS)
}

/** Color-coded expiry status: red (expired), orange (<=3 days), yellow (<=7 days), green (fresh). */
export function getExpiryStatus(expiryDate: Date, now = new Date()): ExpiryStatus {
  const days = daysUntil(expiryDate, now)
  if (days < 0) return 'EXPIRED'
  if (days <= 3) return 'URGENT'
  if (days <= 7) return 'SOON'
  return 'FRESH'
}

/** Attaches the computed expiry-status fields the frontend renders (badge color, days-remaining text) to any pantry item shape. */
export function withComputedFields<T extends { expiryDate: Date }>(item: T) {
  return {
    ...item,
    expiryStatus: getExpiryStatus(item.expiryDate),
    daysRemaining: daysUntil(item.expiryDate),
  }
}

export function expiryDateRangeFor(status: ExpiryStatus, now = new Date()) {
  const today = startOfDay(now)
  const in3 = new Date(today.getTime() + 3 * DAY_MS)
  const in7 = new Date(today.getTime() + 7 * DAY_MS)

  switch (status) {
    case 'EXPIRED':
      return { lt: today }
    case 'URGENT':
      return { gte: today, lt: new Date(in3.getTime() + DAY_MS) }
    case 'SOON':
      return { gt: new Date(in3.getTime() + DAY_MS), lt: new Date(in7.getTime() + DAY_MS) }
    case 'FRESH':
      return { gte: new Date(in7.getTime() + DAY_MS) }
  }
}
