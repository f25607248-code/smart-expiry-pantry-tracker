import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import * as assistantService from './assistant.service.js'

export const insights = asyncHandler(async (req: Request, res: Response) => {
  const data = await assistantService.getInsights(req.user!.sub)
  res.status(200).json({ insights: data })
})

export const score = asyncHandler(async (req: Request, res: Response) => {
  const data = await assistantService.getPantryScore(req.user!.sub)
  res.status(200).json(data)
})

export const ask = asyncHandler(async (req: Request, res: Response) => {
  const reply = await assistantService.askAssistant(req.user!.sub, req.body.question)
  res.status(200).json({ reply })
})
