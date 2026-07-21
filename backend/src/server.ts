import { createApp } from './app.js'
import { env } from './config/env.js'
import { startNotificationCronJobs } from './modules/notifications/notifications.cron.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`Smart Pantry Tracker API listening on http://localhost:${env.PORT}`)
  startNotificationCronJobs()
})
