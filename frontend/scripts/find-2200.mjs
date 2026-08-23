import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

const payouts = await db.payout.findMany({
  where: { createdAt: { gte: since } },
  select: { id: true, sellerId: true, amount: true, status: true, createdAt: true, orderIds: true },
  orderBy: { createdAt: "desc" },
});
console.log("RECENT_PAYOUTS_3D:", JSON.stringify(payouts));

const orders = await db.order.findMany({
  where: { createdAt: { gte: since } },
  select: { id: true, sellerId: true, amount: true, status: true, escrowStatus: true, createdAt: true, isDirectPayment: true, paymentReference: true },
  orderBy: { createdAt: "desc" },
});
console.log("RECENT_ORDERS_3D:", JSON.stringify(orders));

await db.$disconnect();
