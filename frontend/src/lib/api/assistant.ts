import { api } from '@/lib/axios'
import type { Insight, PantryScore } from '@/types'

export async function getInsights() {
  const { data } = await api.get<{ insights: Insight[] }>('/assistant/insights')
  return data.insights
}

export async function getPantryScore() {
  const { data } = await api.get<PantryScore>('/assistant/score')
  return data
}

export async function askAssistant(question: string) {
  const { data } = await api.post<{ reply: string }>('/assistant/ask', { question })
  return data.reply
}
