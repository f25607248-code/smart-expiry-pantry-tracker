import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ApiError } from '../../lib/apiError.js'
import * as receiptsService from './receipts.service.js'

export const scan = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No receipt image uploaded')
  const items = await receiptsService.scanReceipt(req.file.buffer)
  res.status(200).json({ items })
})
