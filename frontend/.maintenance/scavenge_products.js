const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🚀 Starting Corrected Pure JS Catalog Scavenger...');
    
    // Use the UNPOOLED URL for a stable direct connection
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
        
        // 1. Fetch all Products (The full set including Cars)
        const products = await prisma.product.findMany();
        console.log(`✅ Extracted ${products.length} Products.`);

        // 2. Fetch all active Deals
        const deals = await prisma.deal.findMany();
        console.log(`✅ Extracted ${deals.length} Active Deals.`);

        // 3. Build the Manifest
        const manifest = {
            timestamp: new Date().toISOString(),
            source: 'Production Neon',
            counts: {
                products: products.length,
                deals: deals.length
            },
            data: {
                deals,
                products: products.map(p => ({
                    ...p,
                    sellerId: 'global_partner', // Re-map to our new identity
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
        console.log('💡 Catalog parity secured.');

    } catch (error) {
        console.error('❌ Scavenger Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
