import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import * as dashboardService from './dashboard.service.js'

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getOverview(req.user!.sub)
  res.status(200).json(data)
})
