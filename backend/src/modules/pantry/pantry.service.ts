import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../lib/apiError.js'
import { expiryDateRangeFor, withComputedFields } from '../../lib/expiry.js'
import type { listPantryItemsQuerySchema } from './pantry.validation.js'
import type { z } from 'zod'

type ListQuery = z.infer<typeof listPantryItemsQuerySchema>

export async function listItems(userId: string, query: ListQuery) {
  const where: Prisma.PantryItemWhereInput = {
    userId,
    isArchived: query.archived,
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { brand: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.category) where.category = query.category
  if (query.storageLocation) where.storageLocation = query.storageLocation
  if (query.status) where.expiryDate = expiryDateRangeFor(query.status)
  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    where.price = {
      ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
      ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
    }
  }

  const [total, items] = await Promise.all([
    prisma.pantryItem.count({ where }),
    prisma.pantryItem.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    items: items.map(withComputedFields),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

export async function getItem(userId: string, id: string) {
  const item = await prisma.pantryItem.findFirst({ where: { id, userId } })
  if (!item) throw ApiError.notFound('Pantry item not found')
  return withComputedFields(item)
}

export async function createItem(userId: string, data: Prisma.PantryItemUncheckedCreateInput) {
  const item = await prisma.pantryItem.create({ data: { ...data, userId } })
  return withComputedFields(item)
}

export async function updateItem(userId: string, id: string, data: Prisma.PantryItemUncheckedUpdateInput) {
  const existing = await prisma.pantryItem.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Pantry item not found')

  const item = await prisma.pantryItem.update({ where: { id }, data })
  return withComputedFields(item)
}

export async function deleteItem(userId: string, id: string) {
  const existing = await prisma.pantryItem.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Pantry item not found')
  await prisma.pantryItem.delete({ where: { id } })
}

export async function duplicateItem(userId: string, id: string) {
  const existing = await prisma.pantryItem.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Pantry item not found')

  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing
  const copy = await prisma.pantryItem.create({
    data: { ...rest, name: `${rest.name} (copy)`, isArchived: false, archivedAt: null },
  })
  return withComputedFields(copy)
}

export async function archiveItem(
  userId: string,
  id: string,
  disposition: 'CONSUMED' | 'WASTED' | 'DONATED',
  estimatedValue?: number,
) {
  const existing = await prisma.pantryItem.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Pantry item not found')

  const [item] = await prisma.$transaction([
    prisma.pantryItem.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() } }),
    prisma.dispositionLog.create({
      data: {
        userId,
        pantryItemId: id,
        name: existing.name,
        category: existing.category,
        quantity: existing.quantity,
        estimatedValue: estimatedValue ?? existing.price ?? 0,
        disposition,
      },
    }),
  ])

  return withComputedFields(item)
}

export async function restoreItem(userId: string, id: string) {
  const existing = await prisma.pantryItem.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Pantry item not found')

  const item = await prisma.pantryItem.update({ where: { id }, data: { isArchived: false, archivedAt: null } })
  return withComputedFields(item)
}

export async function setItemImage(userId: string, id: string, imageUrl: string) {
  const existing = await prisma.pantryItem.findFirst({ where: { id, userId } })
  if (!existing) throw ApiError.notFound('Pantry item not found')

  const item = await prisma.pantryItem.update({ where: { id }, data: { imageUrl } })
  return withComputedFields(item)
}
