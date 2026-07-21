import { z } from 'zod'

/**
 * Query-string booleans arrive as the literal strings "true"/"false" (or are absent).
 * `z.coerce.boolean()` uses JS's `Boolean(value)` under the hood, and `Boolean("false")` is
 * `true` (any non-empty string is truthy) - so it silently treats every explicit "false" as true.
 * This preprocesses the raw string with a strict equality check before validating as boolean.
 */
export function booleanQueryParam(defaultValue: boolean) {
  return z.preprocess((value) => (typeof value === 'string' ? value === 'true' : value), z.boolean()).default(defaultValue)
}
