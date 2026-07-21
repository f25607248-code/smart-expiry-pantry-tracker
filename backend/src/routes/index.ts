import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes.js'
import usersRoutes from '../modules/users/users.routes.js'
import pantryRoutes from '../modules/pantry/pantry.routes.js'
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js'
import analyticsRoutes from '../modules/analytics/analytics.routes.js'
import shoppingListRoutes from '../modules/shopping-list/shoppingList.routes.js'
import notificationsRoutes from '../modules/notifications/notifications.routes.js'
import integrationsRoutes from '../modules/integrations/integrations.routes.js'
import assistantRoutes from '../modules/assistant/assistant.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', usersRoutes)
router.use('/pantry', pantryRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/shopping-lists', shoppingListRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/integrations', integrationsRoutes)
router.use('/assistant', assistantRoutes)

export default router
