import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as dashboardController from './dashboard.controller.js'

const router = Router()

router.use(requireAuth)
router.get('/overview', dashboardController.overview)

export default router
