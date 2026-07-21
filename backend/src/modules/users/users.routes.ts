import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import { upload } from '../../middleware/upload.middleware.js'
import * as usersController from './users.controller.js'
import { updateProfileSchema, changePasswordSchema } from './users.validation.js'

const router = Router()

router.use(requireAuth)
router.patch('/me', validate({ body: updateProfileSchema }), usersController.updateProfile)
router.post('/me/avatar', upload.single('avatar'), usersController.uploadAvatar)
router.patch('/me/password', validate({ body: changePasswordSchema }), usersController.changePassword)

export default router
