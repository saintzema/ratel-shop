import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
// import { PrismaClient } from '@prisma/client';

import prisma from '../src/lib/prisma';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ Missing DATABASE_URL in .env.local!");
    process.exit(1);
}

const SERPER_API_KEY = process.env.SERPER_API_KEY;


// List of signatures that indicate a missing/broken/test/GMC-rejected image
const isBrokenImage = (url: string | null | undefined) => {
    if (!url) return true;
    url = url.toLowerCase();
    return url.includes('placeholder.png') ||
        url.includes('no photo') ||
        url.includes('no image') ||
        url.includes('n/a') ||
        url.includes('vertexaisearch.cloud.google.com') ||
        url.includes('grounding-api-redirect') ||
        url.includes('googleusercontent.com/grounding') || // GCP grounding links
        url.includes('m.media-amazon.com/images/S/') || // Some Amazon internal thumbnails are too small
        url.startsWith('data:image') || // Base64 is bad for GMC feeds
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
            // GMC prefers white backgrounds and no watermarks
            body: JSON.stringify({ q: query + " product professional photo white background", num: 1 }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.images && data.images.length > 0) {
                const url = data.images[0].imageUrl;
                // Double check it's not another grounding link
                if (!isBrokenImage(url)) return url;
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
                            imageUrl: realImageUrl
                        }
                    });
                    console.log(`✅ [SUCCESS] Updated ${product.name}: ${realImageUrl}`);
                    updatedCount++;
                } else {
                    // FINAL FALLBACK: If Serper fails, ensure it's set to our official placeholder
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            imageUrl: '/assets/images/placeholder.png'
                        }
                    });
                    console.log(`⚠️  [FALLBACK] Replaced ugly data with standard placeholder for: ${product.name}`);
                    updatedCount++;
                }

                // Sleep slightly to respect Serper API rate limits
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
