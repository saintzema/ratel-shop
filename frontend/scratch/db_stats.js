const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.product.count();
  const active = await prisma.product.count({ where: { isActive: true } });
  const bySellerStatus = await prisma.seller.groupBy({
    by: ['status'],
    _count: { _all: true }
  });
  const topSellers = await prisma.seller.findMany({
    take: 10,
    select: { id: true, businessName: true, _count: { select: { products: true } } }
  });

  console.log('--- DB Stats ---');
  console.log('Total Products:', total);
  console.log('Active Products:', active);
  console.log('Sellers by Status:', JSON.stringify(bySellerStatus, null, 2));
  console.log('Top Sellers by Product Count:', JSON.stringify(topSellers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
