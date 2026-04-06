import { db } from '@/lib/db';
import { SEED_PRODUCTS, SEED_SELLERS } from '@/lib/data';

export async function GET() {
    const baseUrl = 'https://fairprice.ng';

    // Static routes
    const staticRoutes = [
        '',
        '/search',
        '/stores',
        '/about',
        '/contact',
        '/terms',
        '/privacy',
    ];

    // Dynamic Product Routes (Try DB first, fallback to SEED)
    let productIds: string[] = [];
    try {
        const dbProducts = await db.product.findMany({
            where: { isActive: true },
            select: { id: true },
            take: 1000,
        });
        productIds = dbProducts.map((p) => p.id);
    } catch (e) {
        productIds = SEED_PRODUCTS.map((p) => p.id);
    }

    // Dynamic Store Routes
    let storeSlugs: string[] = [];
    try {
        const dbSellers = await db.seller.findMany({
            where: { status: 'active' },
            select: { storeUrl: true, id: true },
        });
        storeSlugs = dbSellers.map((s) => s.storeUrl || s.id);
    } catch (e) {
        // Fallback for demo sellers - use id or business_name slugified
        storeSlugs = SEED_SELLERS.map((s) => s.store_url || s.slug || s.id);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${staticRoutes.map(route => `
    <url>
        <loc>${baseUrl}${route}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>${route === '' ? '1.0' : '0.8'}</priority>
    </url>`).join('')}
    ${productIds.map(id => `
    <url>
        <loc>${baseUrl}/product/${id}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`).join('')}
    ${storeSlugs.map(slug => `
    <url>
        <loc>${baseUrl}/store/${slug}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`).join('')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
