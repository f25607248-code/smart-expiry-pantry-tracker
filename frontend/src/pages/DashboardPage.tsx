import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, AlertTriangle, CalendarClock, Ban, PiggyBank, Trash2, Plus, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/dashboard/StatCard'
import { MonthlyMoneyChart } from '@/components/dashboard/MonthlyMoneyChart'
import { PantryScoreBadge } from '@/components/dashboard/PantryScoreBadge'
import { RecipeIdeaCard } from '@/components/dashboard/RecipeIdeaCard'
import { ItemFormDialog } from '@/components/pantry/ItemFormDialog'
import { useAuth } from '@/context/AuthContext'
import { getDashboardOverview } from '@/lib/api/dashboard'
import { getPantryScore } from '@/lib/api/assistant'
import { suggestRecipesFromPantry } from '@/lib/api/recipes'
import { getApiErrorMessage } from '@/lib/axios'
import { formatEnumLabel, formatCurrency } from '@/lib/format'
import { EXPIRY_STATUS_CONFIG, formatDaysRemaining } from '@/lib/expiry'
import type { DashboardOverview, PantryScore, RecipeSuggestion } from '@/types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [score, setScore] = useState<PantryScore | null>(null)
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  async function load() {
    setIsLoading(true)
    try {
      const [data, scoreData] = await Promise.all([getDashboardOverview(), getPantryScore()])
      setOverview(data)
      setScore(scoreData)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load dashboard'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const expiringCount = overview ? overview.expiringToday + overview.expiringThisWeek : 0

  useEffect(() => {
    if (!overview || expiringCount === 0) return
    setRecipesLoading(true)
    suggestRecipesFromPantry()
      .then((data) => setRecipes(data.recipes))
      .catch(() => setRecipes([]))
      .finally(() => setRecipesLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview?.expiringToday, overview?.expiringThisWeek])

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                {expiringCount > 0
                  ? `🍽️ ${expiringCount} food${expiringCount === 1 ? '' : 's'} expiring this week`
                  : `Welcome back, ${user?.name}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {expiringCount > 0
                  ? "Here's what you can cook to use them up before they go to waste."
                  : "Your pantry is in good shape — nothing urgent this week."}
              </p>
            </div>
            {score && <PantryScoreBadge score={score.score} label={score.label} />}
          </div>

          {expiringCount > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recipesLoading ? (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14" />)
              ) : recipes.length > 0 ? (
                recipes.slice(0, 4).map((recipe, i) => <RecipeIdeaCard key={i} recipe={recipe} />)
              ) : (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  Add a couple more pantry items and I'll suggest recipes that use up what's expiring.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/shopping-lists">
                <ListChecks className="mr-1 size-4" /> Shopping lists
              </Link>
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 size-4" /> Add item
            </Button>
          </div>
        </CardContent>
      </Card>

      {overview.expired > 0 && (
        <Card className="border-expiry-expired/30 bg-expiry-expired/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <Ban className="size-5 shrink-0 text-expiry-expired" />
              <div>
                <p className="text-sm font-medium">
                  {overview.expired} expired item{overview.expired === 1 ? '' : 's'} not logged yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Money saved/wasted only count items you've archived — mark these as used or wasted to track them.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/pantry?status=EXPIRED">Review expired items</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total items" value={overview.totalItems} icon={Package} />
        <StatCard label="Expiring today" value={overview.expiringToday} icon={AlertTriangle} tone="urgent" />
        <StatCard label="Expiring this week" value={overview.expiringThisWeek} icon={CalendarClock} tone="soon" />
        <StatCard label="Expired" value={overview.expired} icon={Ban} tone="expired" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label="Money saved this month" value={formatCurrency(overview.moneySavedThisMonth, user?.currency)} icon={PiggyBank} tone="fresh" />
        <StatCard label="Food waste this month" value={formatCurrency(overview.foodWasteThisMonth, user?.currency)} icon={Trash2} tone="expired" />
      </div>

      <MonthlyMoneyChart data={overview.monthlyTrend} currency={user?.currency} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {overview.categories.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
            {overview.categories.map((c) => (
              <div key={c.category} className="flex items-center justify-between text-sm">
                <span>{formatEnumLabel(c.category)}</span>
                <span className="font-medium">{c.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently added</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overview.recentlyAdded.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
            {overview.recentlyAdded.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{item.name}</span>
                <Badge variant={EXPIRY_STATUS_CONFIG[item.expiryStatus].badgeVariant}>
                  {formatDaysRemaining(item.daysRemaining)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ItemFormDialog open={addOpen} onOpenChange={setAddOpen} onSaved={load} />
    </div>
  )
}
