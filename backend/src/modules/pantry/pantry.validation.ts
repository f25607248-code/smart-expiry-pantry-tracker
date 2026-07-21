import { z } from 'zod'
import { booleanQueryParam } from '../../lib/zodHelpers.js'

export const CATEGORY_VALUES = [
  'FRUITS',
  'VEGETABLES',
  'DAIRY',
  'MEAT',
  'SEAFOOD',
  'FROZEN',
  'BAKERY',
  'DRINKS',
  'SNACKS',
  'CANNED_FOOD',
  'CONDIMENTS',
  'OTHERS',
] as const

export const STORAGE_LOCATION_VALUES = ['REFRIGERATOR', 'FREEZER', 'PANTRY', 'CABINET'] as const

export const createPantryItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80).optional(),
  category: z.enum(CATEGORY_VALUES).default('OTHERS'),
  quantity: z.coerce.number().positive().default(1),
  unit: z.string().trim().min(1).max(20).default('pcs'),
  storageLocation: z.enum(STORAGE_LOCATION_VALUES).default('PANTRY'),
  purchaseDate: z.coerce.date().default(() => new Date()),
  expiryDate: z.coerce.date(),
  price: z.coerce.number().nonnegative().optional(),
  barcode: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(1000).optional(),
  imageUrl: z.string().trim().max(500).optional(),
})

export const updatePantryItemSchema = createPantryItemSchema.partial()

export const pantryItemParamsSchema = z.object({
  id: z.string().min(1),
})

export const listPantryItemsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  storageLocation: z.enum(STORAGE_LOCATION_VALUES).optional(),
  status: z.enum(['FRESH', 'SOON', 'URGENT', 'EXPIRED']).optional(),
  archived: booleanQueryParam(false),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  sortBy: z.enum(['expiryDate', 'purchaseDate', 'name', 'quantity', 'category', 'createdAt']).default('expiryDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export const dispositionSchema = z.object({
  disposition: z.enum(['CONSUMED', 'WASTED', 'DONATED']),
  estimatedValue: z.coerce.number().nonnegative().optional(),
})

export const estimateExpiryQuerySchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(CATEGORY_VALUES).default('OTHERS'),
  storageLocation: z.enum(STORAGE_LOCATION_VALUES).default('PANTRY'),
  purchaseDate: z.coerce.date().default(() => new Date()),
})
