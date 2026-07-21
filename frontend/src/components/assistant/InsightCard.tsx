import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, TrendingUp, TrendingDown, Lightbulb, PartyPopper, ShoppingCart, ChefHat, Check, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buildShoppingLinks } from '@/lib/shoppingLinks'
import { listShoppingLists, createShoppingList, addShoppingListItem } from '@/lib/api/shoppingLists'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import type { Insight } from '@/types'

const SEVERITY_STYLES: Record<Insight['severity'], string> = {
  urgent: 'border-expiry-expired/40 bg-expiry-expired/5',
  warning: 'border-expiry-urgent/40 bg-expiry-urgent/5',
  info: 'border-primary/30 bg-primary/5',
  success: 'border-expiry-fresh/40 bg-expiry-fresh/5',
}

const TYPE_ICONS: Record<Insight['type'], React.ComponentType<{ className?: string }>> = {
  EXPIRY: AlertTriangle,
  WASTE_SUMMARY: TrendingDown,
  TOP_WASTED: Lightbulb,
  RESTOCK: ShoppingCart,
  SPENDING_TREND: TrendingUp,
  RECIPE_NUDGE: ChefHat,
  SCORE: PartyPopper,
}

export function InsightCard({ insight }: { insight: Insight }) {
  const Icon = TYPE_ICONS[insight.type]
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)

  async function handleAddToList(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!insight.buyItemName || isAdding || added) return

    setIsAdding(true)
    try {
      const lists = await listShoppingLists()
      const target = lists[0] ?? (await createShoppingList('Shopping List'))
      await addShoppingListItem(target.id, { name: insight.buyItemName, quantity: 1, unit: 'pcs' })
      toast.success(`Added "${insight.buyItemName}" to ${target.name}`)
      setAdded(true)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not add to shopping list'))
    } finally {
      setIsAdding(false)
    }
  }

  const content = (
    <Card className={cn('border', SEVERITY_STYLES[insight.severity])}>
      <CardContent className="flex gap-3 p-3">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{insight.title}</p>
            {insight.severity === 'urgent' && (
              <Badge variant="expired" className="shrink-0">
                Urgent
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{insight.message}</p>
          {insight.buyItemName && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                variant={added ? 'ghost' : 'secondary'}
                className="h-7 px-2 text-xs"
                disabled={isAdding || added}
                onClick={handleAddToList}
              >
                {added ? (
                  <>
                    <Check className="mr-1 size-3" /> Added
                  </>
                ) : (
                  <>
                    <Plus className="mr-1 size-3" /> Add to list
                  </>
                )}
              </Button>
              {buildShoppingLinks(insight.buyItemName).map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-primary hover:underline"
                >
                  Buy on {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return insight.linkTo ? (
    <Link to={insight.linkTo} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}
