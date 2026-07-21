import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { prisma } from '../../lib/prisma.js'
import { daysUntil } from '../../lib/expiry.js'
import * as recipesService from './recipes.service.js'

export const suggest = asyncHandler(async (req: Request, res: Response) => {
  const ingredients = req.body.ingredients as string[]
  const recipes = await recipesService.suggestRecipes(ingredients)
  res.status(200).json({ recipes })
})

export const suggestFromPantry = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.pantryItem.findMany({
    where: { userId: req.user!.sub, isArchived: false },
    select: { name: true, expiryDate: true },
    orderBy: { expiryDate: 'asc' },
    take: 30,
  })

  const ingredientsUsed = items.map((i) => i.name)
  const priorityIngredients = items.filter((i) => daysUntil(i.expiryDate) <= 7).map((i) => i.name)

  const recipes = await recipesService.suggestRecipes(ingredientsUsed, priorityIngredients)
  res.status(200).json({ recipes, ingredientsUsed, priorityIngredients })
})
