import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp.eu-west-2.aws.neon.tech/neondb?sslmode=require"
        }
    }
});

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
