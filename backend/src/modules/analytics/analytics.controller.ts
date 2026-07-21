import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import * as analyticsService from './analytics.service.js'

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub
  const [categories, storage, monthlyWaste, spending, wasteProgress, mostPurchased, expiryTrends] = await Promise.all([
    analyticsService.categoryBreakdown(userId),
    analyticsService.storageUsage(userId),
    analyticsService.monthlyWasteAndSavings(userId),
    analyticsService.grocerySpending(userId),
    analyticsService.wasteReductionProgress(userId),
    analyticsService.mostPurchasedItems(userId),
    analyticsService.expiryTrends(userId),
  ])

  res.status(200).json({
    categories,
    storage,
    monthlyWaste,
    spending,
    wasteProgress,
    mostPurchased,
    expiryTrends,
  })
})
