import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SECURE MAINTENANCE ROUTE
 * This route exists temporarily to scavenge the production catalog.
 * It uses the live database connection to export all products, categories, and deals.
 */

export async function GET(request: Request) {
    // Basic security check: Only allow if a specific header or query param is present
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'zema_scavenge_2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('🚀 API Scavenger Started...');
        
        // Use the UNPOOLED URL to ensure we connect to PRODUCTION Main
        const prodUrl = process.env.DATABASE_URL_UNPOOLED;
        if (!prodUrl) throw new Error('DATABASE_URL_UNPOOLED missing');

        const { PrismaClient } = await import('@prisma/client');
        const prodClient = new PrismaClient({
            datasources: {
                db: { url: prodUrl }
            }
        });

        const products = await prodClient.product.findMany();
        const deals = await prodClient.deal.findMany();
        
        await prodClient.$disconnect();

        // 4. Build Manifest
        const manifest = {
            timestamp: new Date().toISOString(),
            source: 'API Runtime',
            counts: {
                products: products.length,
                deals: deals.length
            },
            data: {
                deals,
                products: products.map((p: any) => ({
                    ...p,
                    sellerId: 'global_partner', // Re-map to our new identity
                    price: Number(p.price),
                    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
                    avgRating: Number(p.avgRating)
                }))
            }
        };

        // 5. Save to disk on the server environment
        const manifestPath = path.join(process.cwd(), '.maintenance', 'production_catalog_snapshot.json');
        
        // Ensure directory exists
        const dir = path.dirname(manifestPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        return NextResponse.json({
            success: true,
            message: `Scavenged ${products.length} products, ${categories.length} categories, and ${deals.length} deals.`,
            manifestPath
        });

    } catch (error: any) {
        console.error('❌ API Scavenge Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
