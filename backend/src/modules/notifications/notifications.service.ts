import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../lib/apiError.js'
import { expiryDateRangeFor } from '../../lib/expiry.js'
import { sendMail, dailyReminderEmailTemplate } from '../../lib/mailer.js'
import type { NotificationType } from '@prisma/client'

export async function list(userId: string, unreadOnly: boolean) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function markRead(userId: string, id: string) {
  const existing = await prisma.notification.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Notification not found')
  return prisma.notification.update({ where: { id }, data: { isRead: true } })
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
}

async function createNotification(userId: string, type: NotificationType, title: string, message: string, relatedItemId?: string) {
  return prisma.notification.create({ data: { userId, type, title, message, relatedItemId } })
}

/** Scans every user's pantry for items expiring today/this week or already expired; creates in-app notifications and sends an email digest. Intended to run once per day via cron. */
export async function runDailyExpiryCheck() {
  const users = await prisma.user.findMany({
    where: { notifyInApp: true },
  })

  for (const user of users) {
    const [expiredItems, urgentItems] = await Promise.all([
      prisma.pantryItem.findMany({ where: { userId: user.id, isArchived: false, expiryDate: expiryDateRangeFor('EXPIRED') } }),
      prisma.pantryItem.findMany({ where: { userId: user.id, isArchived: false, expiryDate: expiryDateRangeFor('URGENT') } }),
    ])

    for (const item of expiredItems) {
      await createNotification(user.id, 'EXPIRED', `${item.name} has expired`, `${item.name} expired on ${item.expiryDate.toDateString()}.`, item.id)
    }
    for (const item of urgentItems) {
      await createNotification(user.id, 'EXPIRY_SOON', `${item.name} is expiring soon`, `${item.name} expires on ${item.expiryDate.toDateString()}.`, item.id)
    }

    if (user.notifyEmail && user.dailySummaryEnabled && (expiredItems.length > 0 || urgentItems.length > 0)) {
      await sendMail({
        to: user.email,
        subject: 'Your daily pantry summary',
        html: dailyReminderEmailTemplate(
          user.name,
          urgentItems.map((i) => `${i.name} (expires ${i.expiryDate.toDateString()})`),
          expiredItems.map((i) => `${i.name} (expired ${i.expiryDate.toDateString()})`),
        ),
      })
    }
  }
}

/** Sends a weekly summary email + in-app notification of upcoming expiries. Intended to run once per week via cron. */
export async function runWeeklyReport() {
  const users = await prisma.user.findMany({ where: { weeklyReportEnabled: true } })

  for (const user of users) {
    const soonItems = await prisma.pantryItem.findMany({
      where: { userId: user.id, isArchived: false, expiryDate: expiryDateRangeFor('SOON') },
    })

    await createNotification(
      user.id,
      'WEEKLY_REPORT',
      'Your weekly pantry report',
      `${soonItems.length} item(s) are expiring in the next week.`,
    )

    if (user.notifyEmail && soonItems.length > 0) {
      await sendMail({
        to: user.email,
        subject: 'Your weekly pantry report',
        html: dailyReminderEmailTemplate(user.name, soonItems.map((i) => `${i.name} (expires ${i.expiryDate.toDateString()})`), []),
      })
    }
  }
}
