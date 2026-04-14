
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    }
  }
});

/**
 * ADOPTION MAP: Maps old common ID patterns to our new 13 core accounts
 * This is based on the scavenging results where we saw various ID formats.
 */
const TARGET_SELLER_ID = 'global_partner'; // The new primary seller ID
const TARGET_BUYER_ID = 'user_abc123def'; // Saint Zema's new ID

async function adoptOrphanedData() {
  console.log('--- Starting Transactional Metric Adoption ---');

  try {
    // 1. Audit current state
    const currentOrders = await prisma.order.count();
    const currentNegotiations = await prisma.negotiationRequest.count();
    
    console.log(`Current Dashboard: ${currentOrders} orders, ${currentNegotiations} negotiations.`);

    // 2. Identify Orphans (Linked to non-existent users)
    const validUsers = await prisma.user.findMany({ select: { id: true } });
    const validUserIds = new Set(validUsers.map(u => u.id));

    const orphanedOrders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: { notIn: Array.from(validUserIds) } },
          { sellerId: { notIn: Array.from(validUserIds) } }
        ]
      }
    });

    const orphanedNegotiations = await prisma.negotiationRequest.findMany({
      where: {
        OR: [
          { customerId: { notIn: Array.from(validUserIds) } },
          { sellerId: { notIn: Array.from(validUserIds) } }
        ]
      }
    });

    console.log(`Found ${orphanedOrders.length} Orphaned Orders.`);
    console.log(`Found ${orphanedNegotiations.length} Orphaned Negotiations.`);

    // 3. Adopt Orders
    let totalRevenueAdopted = 0;
    for (const order of orphanedOrders) {
      const newCustomerId = validUserIds.has(order.customerId) ? order.customerId : TARGET_BUYER_ID;
      const newSellerId = validUserIds.has(order.sellerId) ? order.sellerId : TARGET_SELLER_ID;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          customerId: newCustomerId,
          sellerId: newSellerId
        }
      });
      totalRevenueAdopted += Number(order.totalAmount);
    }

    // 4. Adopt Negotiations
    for (const neg of orphanedNegotiations) {
      const newCustomerId = validUserIds.has(neg.customerId) ? neg.customerId : TARGET_BUYER_ID;
      const newSellerId = validUserIds.has(neg.sellerId) ? neg.sellerId : TARGET_SELLER_ID;

      await prisma.negotiationRequest.update({
        where: { id: neg.id },
        data: {
          customerId: newCustomerId,
          sellerId: newSellerId
        }
      });
    }

    console.log('--- Adoption Complete ---');
    console.log(`Revenue Restored: ₦${totalRevenueAdopted.toLocaleString()}`);
    console.log(`Negotiations Restored: ${orphanedNegotiations.length}`);

  } catch (error) {
    console.error('Adoption failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

adoptOrphanedData();
