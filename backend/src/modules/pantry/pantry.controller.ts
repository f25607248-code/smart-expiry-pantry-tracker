import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ApiError } from '../../lib/apiError.js'
import { localFileUrl } from '../../middleware/upload.middleware.js'
import { param } from '../../lib/params.js'
import { estimateExpiryDate, estimateShelfLifeDays } from '../../lib/shelfLife.js'
import * as pantryService from './pantry.service.js'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await pantryService.listItems(req.user!.sub, req.query as never)
  res.status(200).json(result)
})

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const item = await pantryService.getItem(req.user!.sub, param(req, 'id'))
  res.status(200).json({ item })
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await pantryService.createItem(req.user!.sub, req.body)
  res.status(201).json({ item })
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const item = await pantryService.updateItem(req.user!.sub, param(req, 'id'), req.body)
  res.status(200).json({ item })
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await pantryService.deleteItem(req.user!.sub, param(req, 'id'))
  res.status(204).send()
})

export const duplicate = asyncHandler(async (req: Request, res: Response) => {
  const item = await pantryService.duplicateItem(req.user!.sub, param(req, 'id'))
  res.status(201).json({ item })
})

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const item = await pantryService.archiveItem(req.user!.sub, param(req, 'id'), req.body.disposition, req.body.estimatedValue)
  res.status(200).json({ item })
})

export const restore = asyncHandler(async (req: Request, res: Response) => {
  const item = await pantryService.restoreItem(req.user!.sub, param(req, 'id'))
  res.status(200).json({ item })
})

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image uploaded')
  const item = await pantryService.setItemImage(req.user!.sub, param(req, 'id'), localFileUrl(req.file.filename))
  res.status(200).json({ item })
})

export const estimateExpiry = asyncHandler(async (req: Request, res: Response) => {
  const { name, category, storageLocation, purchaseDate } = req.query as unknown as {
    name: string
    category: 'FRUITS' | 'VEGETABLES' | 'DAIRY' | 'MEAT' | 'SEAFOOD' | 'FROZEN' | 'BAKERY' | 'DRINKS' | 'SNACKS' | 'CANNED_FOOD' | 'CONDIMENTS' | 'OTHERS'
    storageLocation: 'REFRIGERATOR' | 'FREEZER' | 'PANTRY' | 'CABINET'
    purchaseDate: Date
  }
  const expiryDate = estimateExpiryDate(name, category, storageLocation, purchaseDate)
  const shelfLifeDays = estimateShelfLifeDays(name, category, storageLocation)
  res.status(200).json({ expiryDate, shelfLifeDays })
})
