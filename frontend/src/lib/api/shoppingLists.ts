import { api } from '@/lib/axios'
import type { ShoppingList } from '@/types'

export async function listShoppingLists() {
  const { data } = await api.get<{ lists: ShoppingList[] }>('/shopping-lists')
  return data.lists
}

export async function createShoppingList(name: string) {
  const { data } = await api.post<{ list: ShoppingList }>('/shopping-lists', { name })
  return data.list
}

export async function renameShoppingList(id: string, name: string) {
  const { data } = await api.patch<{ list: ShoppingList }>(`/shopping-lists/${id}`, { name })
  return data.list
}

export async function deleteShoppingList(id: string) {
  await api.delete(`/shopping-lists/${id}`)
}

export async function addShoppingListItem(
  listId: string,
  item: { name: string; quantity: number; unit: string; estimatedPrice?: number; notes?: string },
) {
  const { data } = await api.post<{ list: ShoppingList }>(`/shopping-lists/${listId}/items`, item)
  return data.list
}

export async function updateShoppingListItem(
  listId: string,
  itemId: string,
  item: Partial<{ name: string; quantity: number; unit: string; estimatedPrice: number; notes: string; isPurchased: boolean }>,
) {
  const { data } = await api.patch<{ list: ShoppingList }>(`/shopping-lists/${listId}/items/${itemId}`, item)
  return data.list
}

export async function deleteShoppingListItem(listId: string, itemId: string) {
  const { data } = await api.delete<{ list: ShoppingList }>(`/shopping-lists/${listId}/items/${itemId}`)
  return data.list
}

export async function autoAddExpiredItems(listId: string) {
  const { data } = await api.post<{ list: ShoppingList }>(`/shopping-lists/${listId}/auto-add-expired`)
  return data.list
}

export async function shareShoppingList(listId: string) {
  const { data } = await api.post<{ token: string; url: string }>(`/shopping-lists/${listId}/share`)
  return data
}
