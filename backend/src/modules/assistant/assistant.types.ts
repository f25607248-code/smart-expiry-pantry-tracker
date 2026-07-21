export type InsightType = 'EXPIRY' | 'WASTE_SUMMARY' | 'TOP_WASTED' | 'RESTOCK' | 'SPENDING_TREND' | 'RECIPE_NUDGE' | 'SCORE'
export type InsightSeverity = 'urgent' | 'warning' | 'info' | 'success'

export type Insight = {
  id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  message: string
  relatedItemId?: string
  /** If set, the frontend renders "where to buy" deep links (Instacart/Walmart/Amazon search) for this item name. */
  buyItemName?: string
  /** Frontend route to navigate to when the insight card is clicked. */
  linkTo?: string
}
