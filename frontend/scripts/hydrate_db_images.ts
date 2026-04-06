import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// List of signatures that indicate a missing/broken/test image
const isBrokenImage = (url: string | null | undefined) => {
    if (!url) return true;
    url = url.toLowerCase();
    return url.includes('placeholder.png') ||
        url.includes('no photo') ||
        url.includes('no image') ||
        url.includes('n/a') ||
        url.includes('vertexaisearch.cloud.google.com') ||
        url.includes('grounding-api-redirect') ||
        url === '' ||
        url === 'undefined' ||
        url === 'null';
};

async function fetchRealImageForProduct(query: string): Promise<string | null> {
    if (!SERPER_API_KEY) {
        throw new Error("Missing SERPER_API_KEY in environment variables");
    }

    try {
        const response = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: query + " product high quality", num: 1 }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.images && data.images.length > 0) {
                return data.images[0].imageUrl;
            }
        }
    } catch (e) {
        console.error(`Failed to fetch for ${query}:`, e);
    }
    return null;
}

async function run() {
    console.log("🚀 Starting database image hydration process...");

    if (!SERPER_API_KEY) {
        console.error("❌ You must set SERPER_API_KEY in your .env.local file first!");
        process.exit(1);
    }

    try {
        // Fetch all products
        const products = await prisma.product.findMany();
        console.log(`Found ${products.length} total products in the database.`);

        let updatedCount = 0;
        let skipCount = 0;

        for (const product of products) {
            // Check if MAIN image and array FALLBACK are both broken/missing
            const hasBadMain = isBrokenImage(product.imageUrl);
            const hasBadThumbs = !product.images || product.images.length === 0 || isBrokenImage(product.images[0]);

            if (hasBadMain && hasBadThumbs) {
                console.log(`[WAITING] Hydrating missing image for: ${product.name}...`);
                const realImageUrl = await fetchRealImageForProduct(product.name);

                if (realImageUrl) {
                    // Update database with found image
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            imageUrl: realImageUrl,
                            images: [realImageUrl] // Add to image array just in case
                        }
                    });
                    console.log(`✅ [SUCCESS] Updated ${product.name}: ${realImageUrl}`);
                    updatedCount++;
                } else {
                    // FINAL FALLBACK: If Serper fails, ensure it's set beautifully and safely to our official placeholder 
                    // instead of leaving ugly terminal text ('No photo', 'n/a') in the Live DB.
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            imageUrl: '/assets/images/placeholder.png',
                            images: ['/assets/images/placeholder.png']
                        }
                    });
                    console.log(`⚠️  [FALLBACK] Replaced ugly data with standard placeholder for: ${product.name}`);
                    updatedCount++;
                }

                // Sleep slightly to respect Serper API bounds and not get rate-limited
                await new Promise(r => setTimeout(r, 600)); 
            } else {
                skipCount++;
            }
        }

        console.log("\n==================================");
        console.log(`🎉 RUN COMPLETE!`);
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`⏭️ Skipped (Already working): ${skipCount}`);
        console.log("==================================");

    } catch (e) {
        console.error("Catastrophic error running hydration:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
