import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { getNotifications, markAllNotificationsRead } from '@/lib/api/notifications'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const TYPE_TONE: Record<Notification['type'], 'urgent' | 'soon' | 'expired' | 'default'> = {
  EXPIRED: 'expired',
  EXPIRY_TODAY: 'urgent',
  EXPIRY_SOON: 'soon',
  WEEKLY_REPORT: 'default',
  SYSTEM: 'default',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const hasRunThisSession = useRef(false)

  useEffect(() => {
    if (hasRunThisSession.current) return
    hasRunThisSession.current = true

    getNotifications()
      .then(async (items) => {
        setNotifications(items)
        const unread = items.filter((n) => !n.isRead)
        setUnreadCount(unread.length)
        if (unread.length === 0) return

        const preview = unread
          .slice(0, 3)
          .map((n) => n.title)
          .join(', ')
        const extra = unread.length > 3 ? ` +${unread.length - 3} more` : ''
        toast.info(`${unread.length} pantry alert${unread.length === 1 ? '' : 's'}`, {
          description: preview + extra,
        })

        // Once shown for this login/session, clear them so they don't reappear next time.
        await markAllNotificationsRead()
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      })
      .catch(() => {})
  }, [])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn('flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0', !n.isRead && 'bg-accent/50')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  <Badge variant={TYPE_TONE[n.type]} className="shrink-0">
                    {n.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
