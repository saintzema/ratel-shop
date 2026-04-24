// import { PrismaClient } from "@prisma/client";
import prisma from '@/lib/prisma';


async function audit() {
    console.log("--- FINDING REAL SELLER ---");
    const seller = await prisma.seller.findFirst({
        where: { businessName: { contains: "Global Stores" } },
        orderBy: { createdAt: 'desc' }
    });
    console.log("TARGET SELLER FOUND:", JSON.stringify(seller, null, 2));
    console.log("--- END ---");
}

audit()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
