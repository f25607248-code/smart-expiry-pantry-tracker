import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

type MonthlyMoneyPoint = { month: string; moneySaved: number; foodWaste: number }

type Props = {
  data: MonthlyMoneyPoint[]
  currency?: string
}

function ChartTooltip({ active, payload, label, currency }: TooltipContentProps<ValueType, NameType> & { currency: string }) {
  if (!active || !payload?.length) return null
  const saved = payload.find((p) => p.dataKey === 'moneySaved')?.value ?? 0
  const wasted = payload.find((p) => p.dataKey === 'foodWaste')?.value ?? 0
  const net = Number(saved) - Number(wasted)

  return (
    <div className="rounded-lg border bg-popover p-3 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-expiry-fresh">Saved: {formatCurrency(Number(saved), currency)}</p>
      <p className="text-expiry-expired">Lost: {formatCurrency(Number(wasted), currency)}</p>
      <p className={cn('mt-1 border-t pt-1 font-medium', net >= 0 ? 'text-expiry-fresh' : 'text-expiry-expired')}>
        Net: {net >= 0 ? '+' : ''}
        {formatCurrency(net, currency)}
      </p>
    </div>
  )
}

export function MonthlyMoneyChart({ data, currency = 'USD' }: Props) {
  const axisFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }),
    [currency],
  )

  const trend = useMemo(() => {
    if (data.length < 2) return null
    const current = data[data.length - 1]
    const previous = data[data.length - 2]
    const currentNet = current.moneySaved - current.foodWaste
    const previousNet = previous.moneySaved - previous.foodWaste
    return { delta: currentNet - previousNet, previousMonth: previous.month }
  }, [data])

  const hasData = data.some((point) => point.moneySaved > 0 || point.foodWaste > 0)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Money saved vs. lost by month</CardTitle>
          {trend && (
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                trend.delta >= 0 ? 'bg-expiry-fresh/10 text-expiry-fresh' : 'bg-expiry-expired/10 text-expiry-expired',
              )}
            >
              {trend.delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {trend.delta >= 0 ? '+' : ''}
              {formatCurrency(trend.delta, currency)} vs {trend.previousMonth}
            </span>
          )}
        </CardHeader>
        <CardContent className="h-72">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => axisFormatter.format(v)} />
                <Tooltip content={(props) => <ChartTooltip {...props} currency={currency} />} cursor={{ fill: 'var(--muted)' }} />
                <Legend />
                <Bar
                  dataKey="moneySaved"
                  name="Saved"
                  fill="var(--expiry-fresh)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="foodWaste"
                  name="Lost"
                  fill="var(--expiry-expired)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={900}
                  animationBegin={150}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Mark items as consumed or wasted to start tracking monthly savings.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
