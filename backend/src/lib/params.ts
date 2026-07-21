import type { Request } from 'express'
import { ApiError } from './apiError.js'

/** Reads a route param that has already been validated (as a single string) by the validate() middleware. */
export function param(req: Request, name: string): string {
  const value = req.params[name]
  if (typeof value !== 'string') throw ApiError.badRequest(`Missing route parameter: ${name}`)
  return value
}
