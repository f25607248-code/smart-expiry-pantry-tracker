import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { param } from '../../lib/params.js'
import * as shoppingListService from './shoppingList.service.js'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const lists = await shoppingListService.listLists(req.user!.sub)
  res.status(200).json({ lists })
})

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const list = await shoppingListService.getList(req.user!.sub, param(req, 'id'))
  res.status(200).json({ list })
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const list = await shoppingListService.createList(req.user!.sub, req.body.name)
  res.status(201).json({ list })
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const list = await shoppingListService.updateList(req.user!.sub, param(req, 'id'), req.body.name)
  res.status(200).json({ list })
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await shoppingListService.deleteList(req.user!.sub, param(req, 'id'))
  res.status(204).send()
})

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const list = await shoppingListService.addItem(req.user!.sub, param(req, 'id'), req.body)
  res.status(201).json({ list })
})

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const list = await shoppingListService.updateItem(req.user!.sub, param(req, 'id'), param(req, 'itemId'), req.body)
  res.status(200).json({ list })
})

export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const list = await shoppingListService.deleteItem(req.user!.sub, param(req, 'id'), param(req, 'itemId'))
  res.status(200).json({ list })
})

export const autoAddExpired = asyncHandler(async (req: Request, res: Response) => {
  const list = await shoppingListService.autoAddExpiredItems(req.user!.sub, param(req, 'id'))
  res.status(200).json({ list })
})

export const share = asyncHandler(async (req: Request, res: Response) => {
  const result = await shoppingListService.createShareLink(req.user!.sub, param(req, 'id'))
  res.status(200).json(result)
})

export const getShared = asyncHandler(async (req: Request, res: Response) => {
  const list = await shoppingListService.getSharedList(param(req, 'token'))
  res.status(200).json({ list })
})
