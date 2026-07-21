import { api } from '@/lib/axios'
import type { PantryItem, PantryListResponse, Category, StorageLocation, ExpiryStatus, Disposition } from '@/types'

export type PantryListParams = {
  search?: string
  category?: Category
  storageLocation?: StorageLocation
  status?: ExpiryStatus
  archived?: boolean
  priceMin?: number
  priceMax?: number
  sortBy?: 'expiryDate' | 'purchaseDate' | 'name' | 'quantity' | 'category' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type PantryItemInput = {
  name: string
  brand?: string
  category: Category
  quantity: number
  unit: string
  storageLocation: StorageLocation
  purchaseDate: string
  expiryDate: string
  price?: number
  barcode?: string
  notes?: string
  imageUrl?: string
}

export async function listPantryItems(params: PantryListParams) {
  const { data } = await api.get<PantryListResponse>('/pantry', { params })
  return data
}

export async function getPantryItem(id: string) {
  const { data } = await api.get<{ item: PantryItem }>(`/pantry/${id}`)
  return data.item
}

export async function createPantryItem(input: PantryItemInput) {
  const { data } = await api.post<{ item: PantryItem }>('/pantry', input)
  return data.item
}

export async function updatePantryItem(id: string, input: Partial<PantryItemInput>) {
  const { data } = await api.patch<{ item: PantryItem }>(`/pantry/${id}`, input)
  return data.item
}

export async function deletePantryItem(id: string) {
  await api.delete(`/pantry/${id}`)
}

export async function duplicatePantryItem(id: string) {
  const { data } = await api.post<{ item: PantryItem }>(`/pantry/${id}/duplicate`)
  return data.item
}

export async function archivePantryItem(id: string, disposition: Disposition, estimatedValue?: number) {
  const { data } = await api.post<{ item: PantryItem }>(`/pantry/${id}/archive`, { disposition, estimatedValue })
  return data.item
}

export async function restorePantryItem(id: string) {
  const { data } = await api.post<{ item: PantryItem }>(`/pantry/${id}/restore`)
  return data.item
}

export async function uploadPantryItemImage(id: string, file: File) {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await api.post<{ item: PantryItem }>(`/pantry/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.item
}

export async function estimateExpiry(params: {
  name: string
  category: Category
  storageLocation: StorageLocation
  purchaseDate?: string
}) {
  const { data } = await api.get<{ expiryDate: string; shelfLifeDays: number }>('/pantry/estimate-expiry', { params })
  return data
}
