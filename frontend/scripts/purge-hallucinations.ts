
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function purgeHallucinatedData() {
  console.log("🚀 Starting database purge of hallucinated data...");

  // 1. Clear Search Cache (it's the source of hallucinated data)
  const deletedCache = await prisma.searchCache.deleteMany({});
  console.log(`✅ Cleared ${deletedCache.count} entries from SearchCache.`);

  // 2. Clear Hallucinated Products from Global Stores
  // We ONLY target 'global-partners' (Global Stores) to avoid touching real sellers
  const deletedProducts = await prisma.product.deleteMany({
    where: {
      sellerId: 'global-partners',
      OR: [
        { price: { lt: 400000 }, name: { contains: 'iPhone 15', mode: 'insensitive' } },
        { price: { lt: 500000 }, name: { contains: 'iPhone 16', mode: 'insensitive' } },
        { price: { lt: 5000000 }, name: { contains: 'Camry', mode: 'insensitive' } },
        { price: { lt: 12000000 }, name: { contains: 'BYD', mode: 'insensitive' } },
        { price: { lt: 8000000 }, name: { contains: 'Toyota', mode: 'insensitive' } },
        { price: { lt: 8000000 }, name: { contains: 'Lexus', mode: 'insensitive' } },
        { price: { lt: 200000 }, name: { contains: 'Galaxy S2', mode: 'insensitive' } },
        { price: { lt: 1000 }, name: { not: '' } }, // Safety: no real product is < 1000 Naira
      ]
    }
  });
  console.log(`✅ Purged ${deletedProducts.count} hallucinated products from the catalog.`);

  console.log("✨ Database is now clean.");
}

purgeHallucinatedData()
  .catch(e => {
    console.error("❌ Purge failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
