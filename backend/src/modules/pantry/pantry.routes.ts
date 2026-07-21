import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import { upload } from '../../middleware/upload.middleware.js'
import * as pantryController from './pantry.controller.js'
import {
  createPantryItemSchema,
  updatePantryItemSchema,
  pantryItemParamsSchema,
  listPantryItemsQuerySchema,
  dispositionSchema,
  estimateExpiryQuerySchema,
} from './pantry.validation.js'

const router = Router()

router.use(requireAuth)

router.get('/estimate-expiry', validate({ query: estimateExpiryQuerySchema }), pantryController.estimateExpiry)
router.get('/', validate({ query: listPantryItemsQuerySchema }), pantryController.list)
router.post('/', validate({ body: createPantryItemSchema }), pantryController.create)
router.get('/:id', validate({ params: pantryItemParamsSchema }), pantryController.getOne)
router.patch('/:id', validate({ params: pantryItemParamsSchema, body: updatePantryItemSchema }), pantryController.update)
router.delete('/:id', validate({ params: pantryItemParamsSchema }), pantryController.remove)
router.post('/:id/duplicate', validate({ params: pantryItemParamsSchema }), pantryController.duplicate)
router.post('/:id/archive', validate({ params: pantryItemParamsSchema, body: dispositionSchema }), pantryController.archive)
router.post('/:id/restore', validate({ params: pantryItemParamsSchema }), pantryController.restore)
router.post('/:id/image', validate({ params: pantryItemParamsSchema }), upload.single('image'), pantryController.uploadImage)

export default router
