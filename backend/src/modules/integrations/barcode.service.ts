import { env, isBarcodeLookupConfigured } from '../../config/env.js'
import { ApiError } from '../../lib/apiError.js'

export type BarcodeProduct = {
  name: string
  brand?: string
  category?: string
  imageUrl?: string
}

export async function lookupBarcode(code: string): Promise<BarcodeProduct> {
  if (!isBarcodeLookupConfigured) {
    throw ApiError.notImplemented('Barcode lookup requires BARCODE_LOOKUP_API_KEY to be set in the backend .env file.')
  }

  const url = new URL('https://api.barcodelookup.com/v3/products')
  url.searchParams.set('barcode', code)
  url.searchParams.set('key', env.BARCODE_LOOKUP_API_KEY!)

  const response = await fetch(url)
  if (!response.ok) {
    throw ApiError.badRequest(`Barcode lookup failed: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as {
    products?: Array<{ product_name?: string; brand?: string; category?: string; images?: string[] }>
  }
  const product = data.products?.[0]
  if (!product) throw ApiError.notFound('No product found for this barcode')

  return {
    name: product.product_name ?? 'Unknown product',
    brand: product.brand,
    category: product.category,
    imageUrl: product.images?.[0],
  }
}
