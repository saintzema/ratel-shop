/**
 * migrate_ids.js
 * 
 * Transactional migration script to convert all legacy product IDs (p1, p2, temu_*, nj_*, etc.)
 * to SEO-friendly slugs in the PostgreSQL database.
 * 
 * Uses raw Prisma Client with correct model names from schema.prisma.
 * FK field is `productId` (camelCase), not `product_id`.
 * 
 * Related models with product FK:
 *   - Order (productId)
 *   - Review (productId)
 *   - NegotiationRequest (productId)
 *   - PriceAlert (productId)
 *   - Deal (productId)
 *   - Complaint (productId)
 * 
 * Usage: PATH="/usr/local/bin:$PATH" node scripts/migrate_ids.js
 * 
 * ⚠️  Back up the database before running.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env.local');
    process.exit(1);
}

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[''"]/g, '')
        .replace(/[—–]/g, '-')
        .replace(/\+/g, 'plus')
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
}

async function main() {
    console.log('🚀 Starting SEO slug migration...\n');
    
    // Fetch all products with all fields for duplication
    const products = await prisma.product.findMany();
    
    console.log(`Found ${products.length} products in database.`);
    
    const seenSlugs = new Set();
    const idMapping = [];
    
    for (const product of products) {
        const isLegacyId = /^(p\d+|temu_|nj_)/.test(product.id);
        if (!isLegacyId) {
            seenSlugs.add(product.id);
            continue;
        }
        
        let slug = slugify(product.name);
        let finalSlug = slug;
        let counter = 2;
        while (seenSlugs.has(finalSlug)) {
            finalSlug = `${slug}-${counter}`;
            counter++;
        }
        seenSlugs.add(finalSlug);
        idMapping.push({ 
            oldId: product.id, 
            newId: finalSlug, 
            name: product.name,
            originalData: product 
        });
    }
    
    console.log(`\n📋 ${idMapping.length} products need ID migration.`);
    if (idMapping.length === 0) {
        console.log('✅ All products already have SEO-friendly IDs. Nothing to do.');
        return;
    }
    
    console.log('Sample mappings:');
    idMapping.slice(0, 10).forEach(m => console.log(`  ${m.oldId} -> ${m.newId}`));
    
    console.log('\n🔄 Running transactional migration (Create -> Update FKs -> Delete)...');
    
    await prisma.$transaction(async (tx) => {
        // Step 1: Clear SearchCache as it contains old IDs in JSON blobs
        console.log('Sweep 1: Clearing SearchCache...');
        await tx.searchCache.deleteMany({});

        let count = 0;
        for (const { oldId, newId, originalData } of idMapping) {
            count++;
            if (count % 25 === 0 || count === idMapping.length) {
                console.log(`🚀 Progress: ${count}/${idMapping.length} products processed...`);
            }

            // 1. Create the new product record
            const { id, ...dataToCopy } = originalData;
            await tx.product.create({
                data: {
                    ...dataToCopy,
                    id: newId
                }
            });

            // 2. Update all FK references
            await tx.order.updateMany({ where: { productId: oldId }, data: { productId: newId } });
            await tx.review.updateMany({ where: { productId: oldId }, data: { productId: newId } });
            await tx.negotiationRequest.updateMany({ where: { productId: oldId }, data: { productId: newId } });
            await tx.priceAlert.updateMany({ where: { productId: oldId }, data: { productId: newId } });
            await tx.deal.updateMany({ where: { productId: oldId }, data: { productId: newId } });

            // 3. Delete the old product record
            await tx.product.delete({ where: { id: oldId } });
        }
    }, {
        timeout: 900000, // 15 minutes for large migration over remote connection
    });
    
    console.log(`\n✅ Successfully migrated ${idMapping.length} product IDs!`);
    console.log('Referential integrity maintained using Create -> Update -> Delete pattern.');
    console.log('SearchCache cleared.');
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
