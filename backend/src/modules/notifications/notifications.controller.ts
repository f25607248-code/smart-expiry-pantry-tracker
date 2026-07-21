import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { param } from '../../lib/params.js'
import * as notificationsService from './notifications.service.js'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const unreadOnly = Boolean(req.query.unreadOnly)
  const notifications = await notificationsService.list(req.user!.sub, unreadOnly)
  res.status(200).json({ notifications })
})

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationsService.markRead(req.user!.sub, param(req, 'id'))
  res.status(200).json({ notification })
})

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.markAllRead(req.user!.sub)
  res.status(204).send()
})
