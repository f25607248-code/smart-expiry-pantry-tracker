import type { Category, StorageLocation } from '@prisma/client'

type StorageDays = Partial<Record<StorageLocation, number>>

/** Keyword rules checked first (most specific), since category alone is too coarse - "milk" and "cheese" are both DAIRY but expire very differently. */
const ITEM_RULES: { keywords: string[]; days: StorageDays }[] = [
  { keywords: ['milk'], days: { REFRIGERATOR: 7, FREEZER: 90, PANTRY: 1, CABINET: 1 } },
  { keywords: ['egg'], days: { REFRIGERATOR: 30, PANTRY: 7, CABINET: 7 } },
  { keywords: ['yogurt', 'yoghurt'], days: { REFRIGERATOR: 14 } },
  { keywords: ['cheese'], days: { REFRIGERATOR: 21, FREEZER: 180 } },
  { keywords: ['butter'], days: { REFRIGERATOR: 60, FREEZER: 270 } },
  { keywords: ['chicken', 'turkey'], days: { REFRIGERATOR: 2, FREEZER: 270 } },
  { keywords: ['beef', 'steak', 'pork', 'lamb', 'sausage', 'bacon'], days: { REFRIGERATOR: 4, FREEZER: 180 } },
  { keywords: ['fish', 'salmon', 'shrimp', 'seafood'], days: { REFRIGERATOR: 2, FREEZER: 180 } },
  { keywords: ['bread', 'bagel', 'bun'], days: { PANTRY: 5, CABINET: 5, REFRIGERATOR: 10, FREEZER: 90 } },
  { keywords: ['banana'], days: { PANTRY: 5, CABINET: 5, REFRIGERATOR: 10 } },
  { keywords: ['apple'], days: { PANTRY: 14, CABINET: 14, REFRIGERATOR: 30 } },
  { keywords: ['berry', 'berries', 'strawberr', 'raspberr', 'blueberr'], days: { REFRIGERATOR: 5, FREEZER: 240 } },
  { keywords: ['tomato'], days: { PANTRY: 7, CABINET: 7, REFRIGERATOR: 10 } },
  { keywords: ['lettuce', 'spinach', 'salad', 'greens', 'kale', 'herbs'], days: { REFRIGERATOR: 5 } },
  { keywords: ['carrot'], days: { REFRIGERATOR: 21, PANTRY: 10, CABINET: 10 } },
  { keywords: ['potato'], days: { PANTRY: 30, CABINET: 30, REFRIGERATOR: 60 } },
  { keywords: ['onion', 'garlic'], days: { PANTRY: 30, CABINET: 30, REFRIGERATOR: 60 } },
  { keywords: ['rice', 'pasta', 'noodle', 'flour', 'sugar'], days: { PANTRY: 730, CABINET: 730 } },
  { keywords: ['cereal'], days: { PANTRY: 240, CABINET: 240 } },
]

const CATEGORY_DEFAULTS: Record<Category, StorageDays> = {
  FRUITS: { REFRIGERATOR: 10, PANTRY: 5, CABINET: 5, FREEZER: 240 },
  VEGETABLES: { REFRIGERATOR: 10, PANTRY: 7, CABINET: 7, FREEZER: 240 },
  DAIRY: { REFRIGERATOR: 10, FREEZER: 90, PANTRY: 5, CABINET: 5 },
  MEAT: { REFRIGERATOR: 3, FREEZER: 180, PANTRY: 1, CABINET: 1 },
  SEAFOOD: { REFRIGERATOR: 2, FREEZER: 180, PANTRY: 1, CABINET: 1 },
  FROZEN: { FREEZER: 180, REFRIGERATOR: 3, PANTRY: 1, CABINET: 1 },
  BAKERY: { PANTRY: 5, CABINET: 5, REFRIGERATOR: 10, FREEZER: 90 },
  DRINKS: { PANTRY: 270, CABINET: 270, REFRIGERATOR: 14, FREEZER: 180 },
  SNACKS: { PANTRY: 120, CABINET: 120, REFRIGERATOR: 30, FREEZER: 180 },
  CANNED_FOOD: { PANTRY: 730, CABINET: 730, REFRIGERATOR: 730, FREEZER: 730 },
  CONDIMENTS: { REFRIGERATOR: 180, PANTRY: 365, CABINET: 365, FREEZER: 365 },
  OTHERS: { PANTRY: 30, CABINET: 30, REFRIGERATOR: 14, FREEZER: 90 },
}

const FALLBACK_DAYS = 14

export function estimateShelfLifeDays(name: string, category: Category, storageLocation: StorageLocation): number {
  const lower = name.toLowerCase()
  for (const rule of ITEM_RULES) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      const days = rule.days[storageLocation]
      if (days !== undefined) return days
    }
  }
  return CATEGORY_DEFAULTS[category]?.[storageLocation] ?? FALLBACK_DAYS
}

export function estimateExpiryDate(name: string, category: Category, storageLocation: StorageLocation, purchaseDate: Date): Date {
  const days = estimateShelfLifeDays(name, category, storageLocation)
  return new Date(purchaseDate.getTime() + days * 24 * 60 * 60 * 1000)
}
