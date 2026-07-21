import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { param } from '../../lib/params.js'
import * as barcodeService from './barcode.service.js'

export const lookup = asyncHandler(async (req: Request, res: Response) => {
  const product = await barcodeService.lookupBarcode(param(req, 'code'))
  res.status(200).json({ product })
})
