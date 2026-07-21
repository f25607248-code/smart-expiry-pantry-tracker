import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../lib/apiError.js'
import { verifyAccessToken } from '../lib/jwt.js'

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

  if (!token) {
    return next(ApiError.unauthorized('Missing access token'))
  }

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'))
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return next(ApiError.forbidden('Admin access required'))
  }
  next()
}
