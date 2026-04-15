import { db } from '@/lib/db';
import { SEED_PRODUCTS, SEED_SELLERS } from '@/lib/data';
import { getProductUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic'; // Always regenerate on request

export async function GET() {
    const baseUrl = 'https://fairprice.ng';

    // Static routes
    const staticRoutes = [
        '',
        '/search',
        '/stores',
        '/deals',
        '/about',
        '/contact',
        '/terms',
        '/privacy',
        '/help',
        '/partner',
        '/category/baby',
        '/category/beauty',
        '/category/cars',
        '/category/computers',
        '/category/electronics',
        '/category/energy',
        '/category/fashion',
        '/category/fitness',
        '/category/furniture',
        '/category/gaming',
        '/category/grocery',
        '/category/home',
        '/category/office',
        '/category/phones',
        '/category/smartwatch',
        '/category/solar',
        '/category/sports',
    ];

    // Dynamic Product Routes (Try DB first, fallback to SEED)
    let productUrls: string[] = [];
    try {
        const dbProducts = await db.product.findMany({
            where: { isActive: true },
            select: { id: true, name: true, updatedAt: true },
            take: 5000, // Increased limit for growing catalog
        });
        productUrls = dbProducts.map((p) => getProductUrl(p.id, p.name));
    } catch (e) {
        productUrls = SEED_PRODUCTS.map((p) => getProductUrl(p.id, p.name));
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    ${staticRoutes.map(route => `
    <url>
        <loc>${baseUrl}${route}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>${route === '' ? '1.0' : '0.8'}</priority>
    </url>`).join('')}
    ${productUrls.map(url => `
    <url>
        <loc>${baseUrl}${url}</loc>
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
            'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
