import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12)

  const user = await prisma.user.upsert({
    where: { email: 'demo@pantrytracker.app' },
    update: {},
    create: {
      email: 'demo@pantrytracker.app',
      name: 'Demo User',
      passwordHash,
      isEmailVerified: true,
    },
  })

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  await prisma.pantryItem.createMany({
    data: [
      {
        userId: user.id,
        name: 'Whole Milk',
        brand: 'Farmhouse',
        category: 'DAIRY',
        quantity: 1,
        unit: 'liter',
        storageLocation: 'REFRIGERATOR',
        expiryDate: new Date(now + 2 * day),
        price: 3.5,
      },
      {
        userId: user.id,
        name: 'Eggs',
        brand: 'Free Range Co',
        category: 'DAIRY',
        quantity: 12,
        unit: 'pcs',
        storageLocation: 'REFRIGERATOR',
        expiryDate: new Date(now + 10 * day),
        price: 4.2,
      },
      {
        userId: user.id,
        name: 'Sourdough Bread',
        category: 'BAKERY',
        quantity: 1,
        unit: 'loaf',
        storageLocation: 'PANTRY',
        expiryDate: new Date(now + 4 * day),
        price: 5,
      },
      {
        userId: user.id,
        name: 'Cheddar Cheese',
        category: 'DAIRY',
        quantity: 200,
        unit: 'g',
        storageLocation: 'REFRIGERATOR',
        expiryDate: new Date(now - 1 * day),
        price: 6.5,
      },
      {
        userId: user.id,
        name: 'Tomatoes',
        category: 'VEGETABLES',
        quantity: 6,
        unit: 'pcs',
        storageLocation: 'PANTRY',
        expiryDate: new Date(now + 5 * day),
        price: 2.8,
      },
    ],
    skipDuplicates: true,
  })

  console.log(`Seeded demo user: ${user.email} / Password123!`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
