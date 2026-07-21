import { env, isGoogleVisionConfigured } from '../../config/env.js'
import { ApiError } from '../../lib/apiError.js'

export type ParsedReceiptLine = {
  name: string
  price?: number
}

const PRICE_LINE_RE = /^(.+?)\s+\$?(\d+\.\d{2})\s*$/

function parseReceiptText(text: string): ParsedReceiptLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(PRICE_LINE_RE)
      if (!match) return { name: line }
      return { name: match[1].trim(), price: Number(match[2]) }
    })
    .filter((line) => line.name.length > 1)
}

export async function scanReceipt(imageBuffer: Buffer): Promise<ParsedReceiptLine[]> {
  if (!isGoogleVisionConfigured) {
    throw ApiError.notImplemented(
      'Receipt scanning requires GOOGLE_VISION_API_KEY to be set in the backend .env file.',
    )
  }

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBuffer.toString('base64') },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw ApiError.badRequest(`Google Vision request failed: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as {
    responses: { fullTextAnnotation?: { text: string } }[]
  }
  const text = data.responses[0]?.fullTextAnnotation?.text ?? ''
  return parseReceiptText(text)
}
