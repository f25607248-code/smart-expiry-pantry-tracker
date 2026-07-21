import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import * as controller from './shoppingList.controller.js'
import {
  createListSchema,
  updateListSchema,
  listParamsSchema,
  listItemParamsSchema,
  shareTokenParamsSchema,
  createListItemSchema,
  updateListItemSchema,
} from './shoppingList.validation.js'

const router = Router()

// Public route for shared (read-only) lists - must come before requireAuth
router.get('/shared/:token', validate({ params: shareTokenParamsSchema }), controller.getShared)

router.use(requireAuth)

router.get('/', controller.list)
router.post('/', validate({ body: createListSchema }), controller.create)
router.get('/:id', validate({ params: listParamsSchema }), controller.getOne)
router.patch('/:id', validate({ params: listParamsSchema, body: updateListSchema }), controller.update)
router.delete('/:id', validate({ params: listParamsSchema }), controller.remove)
router.post('/:id/items', validate({ params: listParamsSchema, body: createListItemSchema }), controller.addItem)
router.patch('/:id/items/:itemId', validate({ params: listItemParamsSchema, body: updateListItemSchema }), controller.updateItem)
router.delete('/:id/items/:itemId', validate({ params: listItemParamsSchema }), controller.deleteItem)
router.post('/:id/auto-add-expired', validate({ params: listParamsSchema }), controller.autoAddExpired)
router.post('/:id/share', validate({ params: listParamsSchema }), controller.share)

export default router
