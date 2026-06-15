import { db } from '@/lib/db';
import { SEED_PRODUCTS, SEED_SELLERS } from '@/lib/data';
import { getProductUrl } from '@/lib/utils';

export const revalidate = 21600; // Always regenerate on request

export async function GET() {
    const baseUrl = 'https://www.fairprice.ng';

    // Static routes — do NOT include /search; it's disallowed in robots.txt and a
    // robots-blocked URL in the sitemap triggers Google's "Blocked by robots.txt" warning.
    const staticRoutes = [
        '',
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
    // Carry the real updatedAt so <lastmod> is an honest signal — Google distrusts
    // sitemaps where everything reports "changed now" on every fetch.
    let productEntries: { url: string; lastmod: string }[] = [];
    try {
        const dbProducts = await db.product.findMany({
            where: { isActive: true },
            select: { id: true, name: true, slug: true, updatedAt: true } as any,
            take: 5000, // Increased limit for growing catalog
        }) as any[];
        productEntries = dbProducts.map((p) => ({
            url: getProductUrl(p.id, p.name, p.slug || undefined),
            lastmod: (p.updatedAt ? new Date(p.updatedAt) : new Date()).toISOString(),
        }));
    } catch (e) {
        productEntries = SEED_PRODUCTS.map((p) => ({
            url: getProductUrl(p.id, p.name, (p as any).slug),
            lastmod: new Date().toISOString(),
        }));
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
    ${productEntries.map(({ url, lastmod }) => `
    <url>
        <loc>${baseUrl}${url}</loc>
        <lastmod>${lastmod}</lastmod>
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
