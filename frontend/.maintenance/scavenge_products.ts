import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SCAVENGER SCRIPT
 * This script connects to the PRODUCTION database (via DATABASE_URL_UNPOOLED)
 * and extracts all products, categories, and deals into a JSON manifest.
 * It re-maps products to our new "Clean" sellers to ensure continuity.
 */

async function main() {
    console.log('🚀 Starting Production Catalog Scavenger...');
    
    // We use the UNPOOLED URL for a stable direct connection
    const prodUrl = process.env.DATABASE_URL_UNPOOLED;
    if (!prodUrl) {
        console.error('❌ Error: DATABASE_URL_UNPOOLED not found in environment.');
        process.exit(1);
    }

    const prisma = new PrismaClient({
        datasources: {
            db: { url: prodUrl }
        }
    });

    try {
        console.log('📡 Connecting to Production Neon DB...');
        
        // 1. Fetch Categories first (to ensure references match)
        const categories = await prisma.category.findMany();
        console.log(`✅ Extracted ${categories.length} Categories.`);

        // 2. Fetch all Products
        const products = await prisma.product.findMany();
        console.log(`✅ Extracted ${products.length} Products (including Cars and auto-PDPs).`);

        // 3. Fetch all active Deals
        const deals = await prisma.deal.findMany();
        console.log(`✅ Extracted ${deals.length} Active Deals.`);

        // 4. Build the Manifest
        // NOTE: We map all products to 'global_partner' to match our new identity system
        const manifest = {
            timestamp: new Date().toISOString(),
            source: 'Production Neon',
            counts: {
                categories: categories.length,
                products: products.length,
                deals: deals.length
            },
            data: {
                categories,
                deals,
                products: products.map(p => ({
                    ...p,
                    // Re-link to the new seller ID we established in the reseed
                    sellerId: 'global_partner', 
                    // Ensure decimals are handled gracefully if parsed as strings
                    price: Number(p.price),
                    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
                    avgRating: Number(p.avgRating)
                }))
            }
        };

        const manifestPath = path.join(process.cwd(), '.maintenance', 'production_catalog_snapshot.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log('\n--- SUCCESS ---');
        console.log(`📦 Manifest saved to: ${manifestPath}`);
        console.log('💡 You can now use this file to re-seed your DEV environment with 100% parity.');

    } catch (error) {
        console.error('❌ Scavenger Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
