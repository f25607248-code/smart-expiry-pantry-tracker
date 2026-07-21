import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { listPantryItems } from '@/lib/api/pantry'
import { getApiErrorMessage } from '@/lib/axios'
import { EXPIRY_STATUS_CONFIG } from '@/lib/expiry'
import type { PantryItem } from '@/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function CalendarPage() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    listPantryItems({ pageSize: 100, archived: false })
      .then((res) => setItems(res.items))
      .catch((error) => toast.error(getApiErrorMessage(error, 'Could not load calendar data')))
      .finally(() => setIsLoading(false))
  }, [])

  const itemsByExpiryDate = useMemo(() => {
    const map = new Map<string, PantryItem[]>()
    for (const item of items) {
      const key = item.expiryDate.slice(0, 10)
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  }, [items])

  const monthLabel = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const gridDays = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    return days
  }, [cursor])

  const selectedItems = selectedDay ? itemsByExpiryDate.get(selectedDay) ?? [] : []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-36 text-center font-medium">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((date, i) => {
                if (!date) return <div key={i} />
                const key = dateKey(date)
                const dayItems = itemsByExpiryDate.get(key) ?? []
                const isToday = key === dateKey(new Date())
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`flex min-h-16 flex-col items-start gap-1 rounded-md border p-1.5 text-left text-xs transition-colors hover:bg-accent ${
                      selectedDay === key ? 'border-primary' : 'border-border'
                    } ${isToday ? 'bg-accent/50' : ''}`}
                  >
                    <span className="font-medium">{date.getDate()}</span>
                    {dayItems.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className={`w-full truncate rounded px-1 text-[10px] ${
                          item.expiryStatus === 'EXPIRED'
                            ? 'bg-expiry-expired/20 text-expiry-expired'
                            : item.expiryStatus === 'URGENT'
                              ? 'bg-expiry-urgent/20 text-expiry-urgent'
                              : item.expiryStatus === 'SOON'
                                ? 'bg-expiry-soon/20 text-expiry-soon'
                                : 'bg-expiry-fresh/20 text-expiry-fresh'
                        }`}
                      >
                        {item.name}
                      </span>
                    ))}
                    {dayItems.length > 2 && <span className="text-[10px] text-muted-foreground">+{dayItems.length - 2} more</span>}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedDay ? new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a day'}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {selectedItems.length === 0 && <p className="text-sm text-muted-foreground">No items expiring on this day.</p>}
            {selectedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <Badge variant={EXPIRY_STATUS_CONFIG[item.expiryStatus].badgeVariant}>{EXPIRY_STATUS_CONFIG[item.expiryStatus].label}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
