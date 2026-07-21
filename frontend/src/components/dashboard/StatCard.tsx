import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'default' | 'fresh' | 'soon' | 'urgent' | 'expired'
}

const TONE_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-primary bg-primary/10',
  fresh: 'text-expiry-fresh bg-expiry-fresh/10',
  soon: 'text-expiry-soon bg-expiry-soon/15',
  urgent: 'text-expiry-urgent bg-expiry-urgent/15',
  expired: 'text-expiry-expired bg-expiry-expired/10',
}

export function StatCard({ label, value, icon: Icon, tone = 'default' }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', TONE_CLASSES[tone])}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
