export type Category =
  | 'FRUITS'
  | 'VEGETABLES'
  | 'DAIRY'
  | 'MEAT'
  | 'SEAFOOD'
  | 'FROZEN'
  | 'BAKERY'
  | 'DRINKS'
  | 'SNACKS'
  | 'CANNED_FOOD'
  | 'CONDIMENTS'
  | 'OTHERS'

export const CATEGORIES: Category[] = [
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
]

export type StorageLocation = 'REFRIGERATOR' | 'FREEZER' | 'PANTRY' | 'CABINET'

export const STORAGE_LOCATIONS: StorageLocation[] = ['REFRIGERATOR', 'FREEZER', 'PANTRY', 'CABINET']

export type ExpiryStatus = 'FRESH' | 'SOON' | 'URGENT' | 'EXPIRED'

export type Disposition = 'CONSUMED' | 'WASTED' | 'DONATED'

export type User = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: 'USER' | 'ADMIN'
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  theme: 'LIGHT' | 'DARK' | 'SYSTEM'
  language: string
  timezone: string
  currency: string
  measurementUnit: 'metric' | 'imperial'
  notifyEmail: boolean
  notifyInApp: boolean
  dailySummaryEnabled: boolean
  weeklyReportEnabled: boolean
  createdAt: string
}

export type PantryItem = {
  id: string
  userId: string
  name: string
  brand: string | null
  category: Category
  quantity: number
  unit: string
  storageLocation: StorageLocation
  purchaseDate: string
  expiryDate: string
  price: number | null
  barcode: string | null
  notes: string | null
  imageUrl: string | null
  isArchived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  expiryStatus: ExpiryStatus
  daysRemaining: number
}

export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type PantryListResponse = {
  items: PantryItem[]
  pagination: Pagination
}

export type DashboardOverview = {
  totalItems: number
  categories: { category: Category; count: number }[]
  expiringToday: number
  expiringThisWeek: number
  expired: number
  recentlyAdded: PantryItem[]
  moneySavedThisMonth: number
  foodWasteThisMonth: number
  itemsAddedThisMonth: number
  monthlyTrend: { month: string; moneySaved: number; foodWaste: number }[]
}

export type InsightSeverity = 'urgent' | 'warning' | 'info' | 'success'

export type Insight = {
  id: string
  type: 'EXPIRY' | 'WASTE_SUMMARY' | 'TOP_WASTED' | 'RESTOCK' | 'SPENDING_TREND' | 'RECIPE_NUDGE' | 'SCORE'
  severity: InsightSeverity
  title: string
  message: string
  relatedItemId?: string
  buyItemName?: string
  linkTo?: string
}

export type PantryScore = {
  score: number
  label: string
}

export type RecipeSuggestion = {
  title: string
  description: string
  usesIngredients: string[]
}

export type AnalyticsSummary = {
  categories: { category: Category; count: number }[]
  storage: { storageLocation: StorageLocation; count: number }[]
  monthlyWaste: { month: string; moneySaved: number; foodWaste: number }[]
  spending: { month: string; spending: number }[]
  wasteProgress: { month: string; wasteRatePercent: number; consumedCount: number; wastedCount: number }[]
  mostPurchased: { name: string; count: number }[]
  expiryTrends: Record<ExpiryStatus, number>
}

export type ShoppingListItem = {
  id: string
  shoppingListId: string
  name: string
  quantity: number
  unit: string
  estimatedPrice: number | null
  notes: string | null
  isPurchased: boolean
  sourcePantryItemId: string | null
  createdAt: string
  updatedAt: string
}

export type ShoppingList = {
  id: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
  items: ShoppingListItem[]
}

export type Notification = {
  id: string
  userId: string
  type: 'EXPIRY_TODAY' | 'EXPIRY_SOON' | 'EXPIRED' | 'WEEKLY_REPORT' | 'SYSTEM'
  title: string
  message: string
  isRead: boolean
  relatedItemId: string | null
  createdAt: string
}
