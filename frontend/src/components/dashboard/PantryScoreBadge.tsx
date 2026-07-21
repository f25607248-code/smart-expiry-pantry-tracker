import { cn } from '@/lib/utils'
import type { PantryScore } from '@/types'

function scoreTone(score: number) {
  if (score >= 90) return 'text-expiry-fresh border-expiry-fresh/40 bg-expiry-fresh/10'
  if (score >= 70) return 'text-expiry-soon border-expiry-soon/40 bg-expiry-soon/10'
  if (score >= 50) return 'text-expiry-urgent border-expiry-urgent/40 bg-expiry-urgent/10'
  return 'text-expiry-expired border-expiry-expired/40 bg-expiry-expired/10'
}

export function PantryScoreBadge({ score, label }: PantryScore) {
  return (
    <div className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5', scoreTone(score))}>
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="text-xs font-medium leading-none">/100 · {label}</span>
    </div>
  )
}
