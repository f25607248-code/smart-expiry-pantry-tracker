import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ApiError } from '../../lib/apiError.js'
import { localFileUrl } from '../../middleware/upload.middleware.js'
import * as usersService from './users.service.js'

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateProfile(req.user!.sub, req.body)
  res.status(200).json({ user })
})

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image uploaded')
  const url = localFileUrl(req.file.filename)
  const user = await usersService.updateAvatar(req.user!.sub, url)
  res.status(200).json({ user })
})

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await usersService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword)
  res.status(200).json({ message: 'Password changed successfully' })
})
