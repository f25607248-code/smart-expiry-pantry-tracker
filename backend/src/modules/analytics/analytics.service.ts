import { prisma } from '../../lib/prisma.js'
import { lastNMonths } from '../../lib/dateRanges.js'
import { getExpiryStatus } from '../../lib/expiry.js'

export async function categoryBreakdown(userId: string) {
  const groups = await prisma.pantryItem.groupBy({
    by: ['category'],
    where: { userId, isArchived: false },
    _count: { _all: true },
  })
  return groups.map((g) => ({ category: g.category, count: g._count._all }))
}

export async function storageUsage(userId: string) {
  const groups = await prisma.pantryItem.groupBy({
    by: ['storageLocation'],
    where: { userId, isArchived: false },
    _count: { _all: true },
  })
  return groups.map((g) => ({ storageLocation: g.storageLocation, count: g._count._all }))
}

export async function monthlyWasteAndSavings(userId: string, months = 6) {
  const ranges = lastNMonths(months)
  return Promise.all(
    ranges.map(async ({ start, end, label }) => {
      const [consumed, wasted] = await Promise.all([
        prisma.dispositionLog.aggregate({
          where: { userId, disposition: 'CONSUMED', loggedAt: { gte: start, lt: end } },
          _sum: { estimatedValue: true },
        }),
        prisma.dispositionLog.aggregate({
          where: { userId, disposition: 'WASTED', loggedAt: { gte: start, lt: end } },
          _sum: { estimatedValue: true },
        }),
      ])
      return {
        month: label,
        moneySaved: consumed._sum.estimatedValue ?? 0,
        foodWaste: wasted._sum.estimatedValue ?? 0,
      }
    }),
  )
}

export async function grocerySpending(userId: string, months = 6) {
  const ranges = lastNMonths(months)
  return Promise.all(
    ranges.map(async ({ start, end, label }) => {
      const agg = await prisma.pantryItem.aggregate({
        where: { userId, purchaseDate: { gte: start, lt: end } },
        _sum: { price: true },
      })
      return { month: label, spending: agg._sum.price ?? 0 }
    }),
  )
}

export async function wasteReductionProgress(userId: string, months = 6) {
  const ranges = lastNMonths(months)
  return Promise.all(
    ranges.map(async ({ start, end, label }) => {
      const [consumedCount, wastedCount] = await Promise.all([
        prisma.dispositionLog.count({ where: { userId, disposition: 'CONSUMED', loggedAt: { gte: start, lt: end } } }),
        prisma.dispositionLog.count({ where: { userId, disposition: 'WASTED', loggedAt: { gte: start, lt: end } } }),
      ])
      const total = consumedCount + wastedCount
      const wasteRate = total === 0 ? 0 : Math.round((wastedCount / total) * 100)
      return { month: label, wasteRatePercent: wasteRate, consumedCount, wastedCount }
    }),
  )
}

export async function mostPurchasedItems(userId: string, limit = 10) {
  const groups = await prisma.pantryItem.groupBy({
    by: ['name'],
    where: { userId },
    _count: { _all: true },
    orderBy: { _count: { name: 'desc' } },
    take: limit,
  })
  return groups.map((g) => ({ name: g.name, count: g._count._all }))
}

export async function expiryTrends(userId: string) {
  const items = await prisma.pantryItem.findMany({
    where: { userId, isArchived: false },
    select: { expiryDate: true },
  })
  const now = new Date()
  const buckets = { FRESH: 0, SOON: 0, URGENT: 0, EXPIRED: 0 }
  for (const item of items) {
    buckets[getExpiryStatus(item.expiryDate, now)] += 1
  }
  return buckets
}
