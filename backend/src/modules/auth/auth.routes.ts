import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { validate } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import * as authController from './auth.controller.js'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailParamsSchema,
  resendVerificationSchema,
  googleLoginSchema,
  twoFactorLoginSchema,
  twoFactorConfirmSchema,
  twoFactorDisableSchema,
  twoFactorRecoveryCodesSchema,
} from './auth.validation.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register)
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/verify-email/:token', validate({ params: verifyEmailParamsSchema }), authController.verifyEmail)
router.post('/resend-verification', authLimiter, validate({ body: resendVerificationSchema }), authController.resendVerification)
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword)
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword)
router.get('/me', requireAuth, authController.me)

router.post('/google', authLimiter, validate({ body: googleLoginSchema }), authController.googleLogin)
router.post('/2fa/login', authLimiter, validate({ body: twoFactorLoginSchema }), authController.twoFactorLogin)
router.post('/2fa/setup', requireAuth, authController.setupTwoFactor)
router.post('/2fa/confirm', requireAuth, validate({ body: twoFactorConfirmSchema }), authController.confirmTwoFactor)
router.post('/2fa/disable', requireAuth, validate({ body: twoFactorDisableSchema }), authController.disableTwoFactor)
router.post(
  '/2fa/recovery-codes/regenerate',
  requireAuth,
  validate({ body: twoFactorRecoveryCodesSchema }),
  authController.regenerateRecoveryCodes,
)

export default router
