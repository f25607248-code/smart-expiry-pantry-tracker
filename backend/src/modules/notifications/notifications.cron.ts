import cron from 'node-cron'
import { env } from '../../config/env.js'
import { runDailyExpiryCheck, runWeeklyReport } from './notifications.service.js'

export function startNotificationCronJobs() {
  cron.schedule(env.EXPIRY_CHECK_CRON, () => {
    runDailyExpiryCheck().catch((err) => console.error('[cron] daily expiry check failed:', err))
  })

  cron.schedule(env.WEEKLY_REPORT_CRON, () => {
    runWeeklyReport().catch((err) => console.error('[cron] weekly report failed:', err))
  })

  console.log(`[cron] scheduled daily expiry check "${env.EXPIRY_CHECK_CRON}" and weekly report "${env.WEEKLY_REPORT_CRON}"`)
}
