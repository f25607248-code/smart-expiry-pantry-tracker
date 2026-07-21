import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import * as controller from './notifications.controller.js'
import { listNotificationsQuerySchema, notificationParamsSchema } from './notifications.validation.js'

const router = Router()

router.use(requireAuth)
router.get('/', validate({ query: listNotificationsQuerySchema }), controller.list)
router.post('/:id/read', validate({ params: notificationParamsSchema }), controller.markRead)
router.post('/read-all', controller.markAllRead)

export default router
