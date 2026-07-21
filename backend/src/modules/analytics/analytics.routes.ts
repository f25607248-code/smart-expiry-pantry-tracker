import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as analyticsController from './analytics.controller.js'

const router = Router()

router.use(requireAuth)
router.get('/summary', analyticsController.summary)

export default router
