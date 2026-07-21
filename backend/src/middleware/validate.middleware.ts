import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

type Schemas = {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

/**
 * Express 5 exposes `req.query` (and, depending on version, `req.params`) as a getter-only
 * property, so a plain `req.query = ...` throws "Cannot set property query of #<IncomingMessage>
 * which has only a getter". Redefining the property on the request instance shadows that getter
 * with a plain writable value instead.
 */
function overwrite(req: Request, key: 'query' | 'params', value: unknown) {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) req.body = schemas.body.parse(req.body)
    if (schemas.query) overwrite(req, 'query', schemas.query.parse(req.query))
    if (schemas.params) overwrite(req, 'params', schemas.params.parse(req.params))
    next()
  }
}
