const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  dozen: 12,
}

const UNIT_WORDS = 'cartons?|bottles?|packs?|packets?|bags?|boxes?|cans?|pieces?|pcs|kg|g|grams?|liters?|litres?|lbs?|pounds?'

/** Best-effort parse of a spoken quick-add command like "add two cartons of milk" into structured fields. */
export function parseVoiceCommand(transcript: string): { name: string; quantity: number; unit: string } {
  let text = transcript.toLowerCase().trim()
  text = text.replace(/^(please\s+)?add\s+/, '')

  const pattern = new RegExp(`^(\\d+|[a-z]+)\\s+(${UNIT_WORDS})?\\s*(?:of\\s+)?(.+)$`)
  const match = text.match(pattern)

  if (match) {
    const [, quantityRaw, unitRaw, nameRaw] = match
    const quantity = /^\d+$/.test(quantityRaw) ? parseInt(quantityRaw, 10) : (NUMBER_WORDS[quantityRaw] ?? 1)
    const unit = unitRaw ? unitRaw.replace(/s$/, '') : 'pcs'
    return { name: nameRaw.trim(), quantity, unit }
  }

  return { name: text.trim(), quantity: 1, unit: 'pcs' }
}
