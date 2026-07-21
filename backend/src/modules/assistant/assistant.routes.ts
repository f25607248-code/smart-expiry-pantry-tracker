import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import * as assistantController from './assistant.controller.js'
import { askAssistantSchema } from './assistant.validation.js'

const router = Router()

const askLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false })

router.use(requireAuth)

router.get('/insights', assistantController.insights)
router.get('/score', assistantController.score)
router.post('/ask', askLimiter, validate({ body: askAssistantSchema }), assistantController.ask)

export default router
