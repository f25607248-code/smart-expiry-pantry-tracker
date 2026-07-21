import { z } from 'zod'

export const createListSchema = z.object({
  name: z.string().trim().min(1).max(100).default('Shopping List'),
})

export const updateListSchema = createListSchema.partial()

export const listParamsSchema = z.object({ id: z.string().min(1) })
export const listItemParamsSchema = z.object({ id: z.string().min(1), itemId: z.string().min(1) })
export const shareTokenParamsSchema = z.object({ token: z.string().min(1) })

export const createListItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().positive().default(1),
  unit: z.string().trim().min(1).max(20).default('pcs'),
  estimatedPrice: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(500).optional(),
})

export const updateListItemSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  estimatedPrice: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(500).optional(),
  isPurchased: z.boolean().optional(),
})
