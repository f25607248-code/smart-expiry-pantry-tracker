import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../lib/apiError.js'
import { env } from '../../config/env.js'
import { expiryDateRangeFor } from '../../lib/expiry.js'

const listInclude = { items: { orderBy: { createdAt: 'asc' as const } } }

export async function listLists(userId: string) {
  return prisma.shoppingList.findMany({ where: { userId }, include: listInclude, orderBy: { createdAt: 'desc' } })
}

export async function getList(userId: string, id: string) {
  const list = await prisma.shoppingList.findFirst({ where: { id, userId }, include: listInclude })
  if (!list) throw ApiError.notFound('Shopping list not found')
  return list
}

export async function createList(userId: string, name: string) {
  return prisma.shoppingList.create({ data: { userId, name }, include: listInclude })
}

export async function updateList(userId: string, id: string, name: string) {
  const existing = await prisma.shoppingList.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Shopping list not found')
  return prisma.shoppingList.update({ where: { id }, data: { name }, include: listInclude })
}

export async function deleteList(userId: string, id: string) {
  const existing = await prisma.shoppingList.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Shopping list not found')
  await prisma.shoppingList.delete({ where: { id } })
}

export async function addItem(
  userId: string,
  listId: string,
  data: { name: string; quantity: number; unit: string; estimatedPrice?: number; notes?: string },
) {
  const list = await prisma.shoppingList.findFirst({ where: { id: listId, userId } })
  if (!list) throw ApiError.notFound('Shopping list not found')

  await prisma.shoppingListItem.create({ data: { ...data, shoppingListId: listId } })
  return getList(userId, listId)
}

export async function updateItem(
  userId: string,
  listId: string,
  itemId: string,
  data: Partial<{ name: string; quantity: number; unit: string; estimatedPrice: number; notes: string; isPurchased: boolean }>,
) {
  const item = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, shoppingListId: listId, shoppingList: { userId } },
  })
  if (!item) throw ApiError.notFound('Shopping list item not found')

  await prisma.shoppingListItem.update({ where: { id: itemId }, data })
  return getList(userId, listId)
}

export async function deleteItem(userId: string, listId: string, itemId: string) {
  const item = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, shoppingListId: listId, shoppingList: { userId } },
  })
  if (!item) throw ApiError.notFound('Shopping list item not found')

  await prisma.shoppingListItem.delete({ where: { id: itemId } })
  return getList(userId, listId)
}

export async function autoAddExpiredItems(userId: string, listId: string) {
  const list = await prisma.shoppingList.findFirst({ where: { id: listId, userId } })
  if (!list) throw ApiError.notFound('Shopping list not found')

  const expiredItems = await prisma.pantryItem.findMany({
    where: { userId, isArchived: false, expiryDate: expiryDateRangeFor('EXPIRED') },
  })

  if (expiredItems.length > 0) {
    await prisma.shoppingListItem.createMany({
      data: expiredItems.map((item) => ({
        shoppingListId: listId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedPrice: item.price ?? undefined,
        sourcePantryItemId: item.id,
      })),
    })
  }

  return getList(userId, listId)
}

const SHARE_TOKEN_TYPE = 'shopping-list-share'

export async function createShareLink(userId: string, listId: string) {
  const list = await prisma.shoppingList.findFirst({ where: { id: listId, userId } })
  if (!list) throw ApiError.notFound('Shopping list not found')

  const token = jwt.sign({ listId, type: SHARE_TOKEN_TYPE }, env.JWT_ACCESS_SECRET, { expiresIn: '30d' })
  return { token, url: `${env.CLIENT_URL}/shared/shopping-lists/${token}` }
}

export async function getSharedList(token: string) {
  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload
  } catch {
    throw ApiError.badRequest('Invalid or expired share link')
  }
  if (payload.type !== SHARE_TOKEN_TYPE || typeof payload.listId !== 'string') {
    throw ApiError.badRequest('Invalid share link')
  }

  const list = await prisma.shoppingList.findUnique({ where: { id: payload.listId }, include: listInclude })
  if (!list) throw ApiError.notFound('Shopping list not found')
  return list
}
