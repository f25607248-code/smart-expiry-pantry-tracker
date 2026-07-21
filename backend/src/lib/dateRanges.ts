export function lastNMonths(n: number, now = new Date()) {
  const months: { start: Date; end: Date; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = start.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    months.push({ start, end, label })
  }
  return months
}
