import { prisma } from '../../lib/prisma.js'
import { expiryDateRangeFor, withComputedFields } from '../../lib/expiry.js'
import { monthlyWasteAndSavings } from '../analytics/analytics.service.js'

function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

export async function getOverview(userId: string) {
  const { start, end } = monthRange()

  const [
    totalItems,
    categoryGroups,
    expiringTodayCount,
    expiringWeekCount,
    expiredCount,
    recentlyAdded,
    moneySavedAgg,
    wasteAgg,
    itemsAddedThisMonth,
    monthlyTrend,
  ] = await Promise.all([
    prisma.pantryItem.count({ where: { userId, isArchived: false } }),
    prisma.pantryItem.groupBy({
      by: ['category'],
      where: { userId, isArchived: false },
      _count: { _all: true },
    }),
    prisma.pantryItem.count({
      where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('URGENT') },
    }),
    prisma.pantryItem.count({
      where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('SOON') },
    }),
    prisma.pantryItem.count({
      where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('EXPIRED') },
    }),
    prisma.pantryItem.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.dispositionLog.aggregate({
      where: { userId, disposition: 'CONSUMED', loggedAt: { gte: start, lt: end } },
      _sum: { estimatedValue: true },
    }),
    prisma.dispositionLog.aggregate({
      where: { userId, disposition: 'WASTED', loggedAt: { gte: start, lt: end } },
      _sum: { estimatedValue: true },
    }),
    prisma.pantryItem.count({ where: { userId, createdAt: { gte: start, lt: end } } }),
    monthlyWasteAndSavings(userId, 6),
  ])

  return {
    totalItems,
    categories: categoryGroups.map((g) => ({ category: g.category, count: g._count._all })),
    expiringToday: expiringTodayCount,
    expiringThisWeek: expiringWeekCount,
    expired: expiredCount,
    recentlyAdded: recentlyAdded.map(withComputedFields),
    moneySavedThisMonth: moneySavedAgg._sum.estimatedValue ?? 0,
    foodWasteThisMonth: wasteAgg._sum.estimatedValue ?? 0,
    itemsAddedThisMonth,
    monthlyTrend,
  }
}
