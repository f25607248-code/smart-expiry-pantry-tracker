import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import * as recipesController from './recipes.controller.js'
import * as barcodeController from './barcode.controller.js'
import * as receiptsController from './receipts.controller.js'

const router = Router()
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })

router.use(requireAuth)

router.post(
  '/recipes/suggest',
  validate({ body: z.object({ ingredients: z.array(z.string().min(1)).min(1) }) }),
  recipesController.suggest,
)
router.get('/recipes/from-pantry', recipesController.suggestFromPantry)

router.get('/barcode/:code', validate({ params: z.object({ code: z.string().min(1) }) }), barcodeController.lookup)

router.post('/receipts/scan', memoryUpload.single('receipt'), receiptsController.scan)

export default router
