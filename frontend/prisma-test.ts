import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const productCount = await prisma.product.count()
  console.log('PRISMA CHECK: Product count =', productCount)
  const products = await prisma.product.findMany({ take: 5 })
  console.log('PRISMA CHECK: Sample products =', products.map(p => p.name))
}

main()
  .catch(e => {
    console.error('PRISMA CHECK ERROR:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
