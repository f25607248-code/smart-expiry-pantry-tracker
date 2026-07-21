import { api } from '@/lib/axios'

export type BarcodeProduct = {
  name: string
  brand?: string
  category?: string
  imageUrl?: string
}

export async function lookupBarcode(code: string) {
  const { data } = await api.get<{ product: BarcodeProduct }>(`/integrations/barcode/${code}`)
  return data.product
}

export type ParsedReceiptLine = {
  name: string
  price?: number
}

export async function scanReceipt(file: File) {
  const formData = new FormData()
  formData.append('receipt', file)
  const { data } = await api.post<{ items: ParsedReceiptLine[] }>('/integrations/receipts/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.items
}
