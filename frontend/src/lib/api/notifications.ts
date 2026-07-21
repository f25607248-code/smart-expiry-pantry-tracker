import { api } from '@/lib/axios'
import type { Notification } from '@/types'

export async function getNotifications(unreadOnly = false) {
  const { data } = await api.get<{ notifications: Notification[] }>('/notifications', {
    params: unreadOnly ? { unreadOnly: true } : undefined,
  })
  return data.notifications
}

export async function markNotificationRead(id: string) {
  const { data } = await api.post<{ notification: Notification }>(`/notifications/${id}/read`)
  return data.notification
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/read-all')
}
