import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Normalizes a phone number to international format (E.164) for Nigeria
 * Strips all non-digits, handles leading 0, and ensure 234 prefix
 * NOTE: Keep this in sync with WhatsAppService.normalizePhoneNumber in src/lib/whatsapp-service.ts
 */
function normalizePhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, "");
    
    // Handle Nigerian format: 081... -> 23481...
    if (clean.startsWith("0") && clean.length === 11) {
        clean = "234" + clean.substring(1);
    }
    
    // If it starts with 81... and is 10 digits, add 234
    if (!clean.startsWith("234") && clean.length === 10) {
        clean = "234" + clean;
    }

    return clean;
}

async function main() {
    console.log("🚀 Starting phone number normalization migration...");
    
    if (!process.env.DATABASE_URL) {
        console.error("❌ ERROR: DATABASE_URL environment variable is missing.");
        process.exit(1);
    }

    const env = process.env.NODE_ENV || "development";
    console.log(`📡 Environment: ${env}`);
    
    if (env === "production") {
        console.warn("⚠️  WARNING: Running against PRODUCTION database.");
        // Add a small delay for user to cancel if needed
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const users = await prisma.user.findMany({
        where: {
            whatsappNumber: { not: null }
        }
    });

    console.log(`Found ${users.length} users with WhatsApp numbers.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
        if (!user.whatsappNumber) continue;

        const normalized = normalizePhoneNumber(user.whatsappNumber);

        if (normalized !== user.whatsappNumber) {
            console.log(`Updating user ${user.email}: ${user.whatsappNumber} -> ${normalized}`);
            
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { whatsappNumber: normalized }
                });
                updatedCount++;
            } catch (err) {
                console.error(`Failed to update user ${user.id}:`, err);
            }
        } else {
            skippedCount++;
        }
    }

    const verifications = await prisma.whatsAppVerification.findMany();
    for (const v of verifications) {
        const normalized = normalizePhoneNumber(v.phoneNumber);
        if (normalized !== v.phoneNumber) {
            await prisma.whatsAppVerification.update({
                where: { id: v.id },
                data: { phoneNumber: normalized }
            });
        }
    }

    // Normalize Seller WhatsApp numbers
    const sellers = await prisma.seller.findMany({
        where: { whatsappNumber: { not: null } }
    });
    console.log(`Found ${sellers.length} sellers with WhatsApp numbers.`);
    for (const s of sellers) {
        if (!s.whatsappNumber) continue;
        const normalized = normalizePhoneNumber(s.whatsappNumber);
        if (normalized !== s.whatsappNumber) {
            console.log(`Updating seller ${s.businessName}: ${s.whatsappNumber} -> ${normalized}`);
            await prisma.seller.update({
                where: { id: s.id },
                data: { whatsappNumber: normalized }
            });
        }
    }

    // Normalize Address phone numbers
    const addresses = await prisma.address.findMany({
        where: { phone: { not: null } }
    });
    console.log(`Found ${addresses.length} addresses with phone numbers.`);
    for (const a of addresses) {
        if (!a.phone) continue;
        const normalized = normalizePhoneNumber(a.phone);
        if (normalized !== a.phone) {
            console.log(`Updating address ${a.id}: ${a.phone} -> ${normalized}`);
            await prisma.address.update({
                where: { id: a.id },
                data: { phone: normalized }
            });
        }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Already normalized: ${skippedCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
