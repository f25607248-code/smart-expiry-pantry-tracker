import { api } from '@/lib/axios'
import type { DashboardOverview } from '@/types'

export async function getDashboardOverview() {
  const { data } = await api.get<DashboardOverview>('/dashboard/overview')
  return data
}
