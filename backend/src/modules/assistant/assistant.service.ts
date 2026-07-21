import { prisma } from '../../lib/prisma.js'
import { daysUntil, expiryDateRangeFor } from '../../lib/expiry.js'
import { lastNMonths } from '../../lib/dateRanges.js'
import { env, isGeminiConfigured, isOpenAiConfigured } from '../../config/env.js'
import type { Insight } from './assistant.types.js'

type ChatMessage = { role: 'system' | 'user'; content: string }

async function openAiCompletion(apiKey: string, model: string, messages: ChatMessage[]): Promise<string | null> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.6 }),
  })

  if (!response.ok) return null

  const data = (await response.json()) as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message.content ?? null
}

async function geminiCompletion(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string | null> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.6 },
    }),
  })

  if (!response.ok) return null

  const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null
}

function insight(partial: Omit<Insight, 'id'> & { id?: string }): Insight {
  return { id: `${partial.type}-${Math.abs(hashString(partial.message))}`, ...partial }
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return hash
}

async function expiryInsights(userId: string): Promise<Insight[]> {
  const items = await prisma.pantryItem.findMany({
    where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('URGENT') },
    orderBy: { expiryDate: 'asc' },
    take: 5,
  })

  return items.map((item) => {
    const days = daysUntil(item.expiryDate)
    const message =
      days < 0
        ? `${item.name} expired ${Math.abs(days)} day(s) ago — check if it's still safe to use.`
        : days === 0
          ? `${item.name} expires today — use it or lose it!`
          : `${item.name} expires in ${days} day(s) — plan a meal around it.`

    return insight({
      type: 'EXPIRY',
      severity: days <= 0 ? 'urgent' : 'warning',
      title: days <= 0 ? 'Expiring now' : 'Expiring soon',
      message,
      relatedItemId: item.id,
      linkTo: '/pantry',
    })
  })
}

async function wasteSummaryInsight(userId: string): Promise<Insight | null> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const agg = await prisma.dispositionLog.aggregate({
    where: { userId, disposition: 'WASTED', loggedAt: { gte: start, lt: end } },
    _sum: { estimatedValue: true },
  })
  const wasted = agg._sum.estimatedValue ?? 0

  if (wasted <= 0) {
    return insight({
      type: 'WASTE_SUMMARY',
      severity: 'success',
      title: 'No waste this month',
      message: "You haven't logged any wasted food this month — keep it up!",
      linkTo: '/analytics',
    })
  }

  return insight({
    type: 'WASTE_SUMMARY',
    severity: 'warning',
    title: 'Food waste this month',
    message: `You've wasted about $${wasted.toFixed(2)} in food this month. Check what's expiring soon to use it up first.`,
    linkTo: '/analytics',
  })
}

async function topWastedInsight(userId: string): Promise<Insight | null> {
  const since = new Date()
  since.setMonth(since.getMonth() - 3)

  const groups = await prisma.dispositionLog.groupBy({
    by: ['name'],
    where: { userId, disposition: 'WASTED', loggedAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { name: 'desc' } },
    take: 1,
  })

  const top = groups[0]
  if (!top || top._count._all < 2) return null

  return insight({
    type: 'TOP_WASTED',
    severity: 'info',
    title: 'Buying pattern',
    message: `${top.name} is your most-wasted item — thrown out ${top._count._all} times in the last 3 months. Try buying a smaller quantity next time.`,
    buyItemName: top.name,
  })
}

async function restockPredictionInsights(userId: string): Promise<Insight[]> {
  const items = await prisma.pantryItem.findMany({
    where: { userId },
    select: { name: true, purchaseDate: true },
    orderBy: { purchaseDate: 'asc' },
  })

  const byName = new Map<string, Date[]>()
  for (const item of items) {
    const key = item.name.trim().toLowerCase()
    byName.set(key, [...(byName.get(key) ?? []), item.purchaseDate])
  }

  const predictions: Insight[] = []
  const now = new Date()

  for (const [name, dates] of byName) {
    if (dates.length < 2) continue

    const intervals: number[] = []
    for (let i = 1; i < dates.length; i++) {
      intervals.push(Math.round((dates[i].getTime() - dates[i - 1].getTime()) / (24 * 60 * 60 * 1000)))
    }
    const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    if (avgInterval <= 0) continue

    const lastPurchase = dates[dates.length - 1]
    const daysSineLastPurchase = Math.round((now.getTime() - lastPurchase.getTime()) / (24 * 60 * 60 * 1000))

    // Surface a prediction once the elapsed time is within a couple of days of the usual interval.
    if (daysSineLastPurchase >= avgInterval - 2) {
      const displayName = name.charAt(0).toUpperCase() + name.slice(1)
      predictions.push(
        insight({
          type: 'RESTOCK',
          severity: 'info',
          title: 'Time to restock?',
          message: `You usually buy ${displayName} every ~${avgInterval} day(s) — it's been ${daysSineLastPurchase} day(s) since your last purchase.`,
          buyItemName: displayName,
        }),
      )
    }
  }

  return predictions.slice(0, 3)
}

async function spendingTrendInsight(userId: string): Promise<Insight | null> {
  // lastNMonths returns oldest-to-newest, so index 0 is last month and index 1 is the current month.
  const [lastMonth, thisMonth] = lastNMonths(2)

  const [thisAgg, lastAgg] = await Promise.all([
    prisma.pantryItem.aggregate({ where: { userId, purchaseDate: { gte: thisMonth.start, lt: thisMonth.end } }, _sum: { price: true } }),
    prisma.pantryItem.aggregate({ where: { userId, purchaseDate: { gte: lastMonth.start, lt: lastMonth.end } }, _sum: { price: true } }),
  ])

  const thisSpend = thisAgg._sum.price ?? 0
  const lastSpend = lastAgg._sum.price ?? 0
  if (thisSpend === 0 && lastSpend === 0) return null

  const delta = thisSpend - lastSpend
  if (Math.abs(delta) < 1) return null

  return insight({
    type: 'SPENDING_TREND',
    severity: delta > 0 ? 'warning' : 'success',
    title: 'Spending trend',
    message:
      delta > 0
        ? `You've spent $${delta.toFixed(2)} more on groceries this month than last month.`
        : `You've spent $${Math.abs(delta).toFixed(2)} less on groceries this month than last month. Nice!`,
    linkTo: '/analytics',
  })
}

async function recipeNudgeInsight(userId: string): Promise<Insight | null> {
  const count = await prisma.pantryItem.count({
    where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('SOON') },
  })
  const urgentCount = await prisma.pantryItem.count({
    where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('URGENT') },
  })
  const total = count + urgentCount
  if (total === 0) return null

  return insight({
    type: 'RECIPE_NUDGE',
    severity: 'info',
    title: 'Cook before it expires',
    message: `${total} item(s) expire within a week — see recipe ideas that use them up.`,
    linkTo: '/dashboard',
  })
}

export async function getInsights(userId: string): Promise<Insight[]> {
  const [expiry, waste, topWasted, restock, spending, recipeNudge] = await Promise.all([
    expiryInsights(userId),
    wasteSummaryInsight(userId),
    topWastedInsight(userId),
    restockPredictionInsights(userId),
    spendingTrendInsight(userId),
    recipeNudgeInsight(userId),
  ])

  const severityOrder: Record<Insight['severity'], number> = { urgent: 0, warning: 1, info: 2, success: 3 }

  return [...expiry, recipeNudge, waste, ...restock, topWasted, spending]
    .filter((i): i is Insight => i !== null)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

/** Freshness score out of 100: rewards fresh stock, penalizes urgent/expired items sitting in the pantry. */
export async function getPantryScore(userId: string): Promise<{ score: number; label: string }> {
  const [fresh, soon, urgent, expired] = await Promise.all([
    prisma.pantryItem.count({ where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('FRESH') } }),
    prisma.pantryItem.count({ where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('SOON') } }),
    prisma.pantryItem.count({ where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('URGENT') } }),
    prisma.pantryItem.count({ where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('EXPIRED') } }),
  ])

  const total = fresh + soon + urgent + expired
  if (total === 0) return { score: 100, label: 'Nothing tracked yet' }

  const raw = 100 - (expired * 15 + urgent * 6 + soon * 1.5) / total
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs attention' : 'Take action now'
  return { score, label }
}

const HELP_SUMMARY =
  'I can tell you what\'s expiring soon, suggest recipes to use it up, flag restock patterns, and point you to the right page — try "what\'s expiring soon?", "what can I cook tonight?", or "where do I see my spending?"'

const NAV_PAGES: { pattern: RegExp; name: string; blurb: string }[] = [
  { pattern: /\b(dashboards?|home page|overview)\b/, name: 'Dashboard', blurb: 'your stats, money saved/lost by month, and quick-add' },
  { pattern: /\b(pantry|my items|item lists?|inventory)\b/, name: 'Pantry', blurb: 'every item you\'ve added, with search, edit, and archive' },
  { pattern: /\b(shopping lists?|shopping carts?|grocery lists?)\b/, name: 'Shopping Lists', blurb: 'lists you\'re building for your next grocery run' },
  { pattern: /\b(analytics|spending|charts?|trends?|reports?)\b/, name: 'Analytics', blurb: 'charts on spending, waste, and category breakdowns' },
  { pattern: /\b(calendars?|schedules?)\b/, name: 'Calendar', blurb: 'expiry dates laid out by day' },
  { pattern: /\b(settings?|preferences?|profile|accounts?)\b/, name: 'Settings', blurb: 'your notification, theme, and account preferences' },
]

function cannedReply(question: string, expiringSoon: string[]): string {
  const lower = question.toLowerCase().trim()

  if (/^(hi|hey|hello|yo|sup|howdy)\b/.test(lower) || /\bwhat'?s up\b/.test(lower)) {
    return `Hey! 👋 ${HELP_SUMMARY}`
  }
  if (/\b(thanks|thank you|thx|appreciate it)\b/.test(lower)) {
    return "You're welcome! Happy to help — just ask if anything else comes up."
  }
  if (/\b(bye|goodbye|see ya|see you)\b/.test(lower)) {
    return 'Bye! Come back anytime you want to check your pantry.'
  }
  if (/\b(what can you do|how can you help|what do you do|help me|need help)\b/.test(lower)) {
    return HELP_SUMMARY
  }

  if (lower.includes('cook') || lower.includes('recipe') || lower.includes('dinner') || lower.includes('meal')) {
    return expiringSoon.length > 0
      ? `Based on what's expiring soon (${expiringSoon.slice(0, 5).join(', ')}), check the recipe suggestions on your Dashboard — they're prioritized to use those up first.`
      : "Nothing is expiring soon right now! Add a few pantry items and I'll suggest recipes that use up what's about to expire."
  }
  if (lower.includes('expir') || lower.includes('soon') || lower.includes('waste')) {
    return expiringSoon.length > 0
      ? `These items need attention soon: ${expiringSoon.slice(0, 5).join(', ')}. Check the Pantry page to see exact dates.`
      : 'Nothing is expiring in the next few days — your pantry looks good!'
  }
  if (lower.includes('buy') || lower.includes('shop')) {
    return "Check your Shopping Lists page, or look at the Assistant insights for restock suggestions based on your usual buying pattern."
  }

  const page = NAV_PAGES.find((p) => p.pattern.test(lower))
  if (page) {
    return `Head to the ${page.name} page (left sidebar) — that's where you'll find ${page.blurb}.`
  }

  return HELP_SUMMARY + (isGeminiConfigured || isOpenAiConfigured ? '' : ' (Tip: add a GEMINI_API_KEY or OPENAI_API_KEY to backend/.env for smarter, free-form answers.)')
}

const SYSTEM_PROMPT =
  'You are a friendly pantry assistant for a food-waste-reduction app. Answer briefly (2-4 sentences). Respond naturally to greetings, thanks, and small talk. ' +
  'Prioritize suggesting the user use up soon-to-expire ingredients, and suggest simple recipes when asked. Only reference the pantry items you are given. ' +
  "The app has these pages, reachable from the left sidebar: Dashboard (/dashboard - stats, monthly savings chart), Pantry (/pantry - item list, search, edit), " +
  'Shopping Lists (/shopping-lists), Analytics (/analytics - spending & waste charts), Calendar (/calendar - expiry dates by day), Settings (/settings - preferences). ' +
  'When the user asks where to find something or how to do something in the app, point them to the right page by name.'

export async function askAssistant(userId: string, question: string): Promise<string> {
  const items = await prisma.pantryItem.findMany({
    where: { userId, isArchived: false },
    orderBy: { expiryDate: 'asc' },
    select: { name: true, expiryDate: true, quantity: true, unit: true },
    take: 40,
  })

  const expiringSoon = items
    .filter((item) => daysUntil(item.expiryDate) <= 7)
    .map((item) => item.name)

  if (!isGeminiConfigured && !isOpenAiConfigured) {
    return cannedReply(question, expiringSoon)
  }

  const pantrySummary = items.length
    ? items.map((item) => `${item.name} (${item.quantity} ${item.unit}, expires in ${daysUntil(item.expiryDate)}d)`).join('; ')
    : 'The pantry is currently empty.'

  const userPrompt = `My pantry: ${pantrySummary}\n\nQuestion: ${question}`

  if (isGeminiConfigured) {
    const reply = await geminiCompletion(env.GEMINI_API_KEY!, 'gemini-2.5-flash', SYSTEM_PROMPT, userPrompt)
    if (reply) return reply
  }

  if (isOpenAiConfigured) {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]
    const reply = await openAiCompletion(env.OPENAI_API_KEY!, 'gpt-4o-mini', messages)
    if (reply) return reply
  }

  return cannedReply(question, expiringSoon)
}
