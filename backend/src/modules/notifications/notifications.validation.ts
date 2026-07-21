import { z } from 'zod'
import { booleanQueryParam } from '../../lib/zodHelpers.js'

export const listNotificationsQuerySchema = z.object({
  unreadOnly: booleanQueryParam(false),
})

export const notificationParamsSchema = z.object({
  id: z.string().min(1),
})
