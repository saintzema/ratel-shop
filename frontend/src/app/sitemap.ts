import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { SEED_PRODUCTS, SEED_SELLERS } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://fairprice.ng';

    // Static routes
    const routes = [
        '',
        '/search',
        '/stores',
        '/about',
        '/contact',
        '/terms',
        '/privacy',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Dynamic Product Routes (Try DB first, fallback to SEED)
    let productRoutes: any[] = [];
    try {
        const dbProducts = await db.product.findMany({
            where: { is_active: true },
            select: { id: true, updated_at: true },
            take: 1000, // Limit for sitemap performance
        });

        productRoutes = dbProducts.map((product) => ({
            url: `${baseUrl}/product/${product.id}`,
            lastModified: product.updated_at || new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        }));
    } catch (e) {
        // Fallback to seeds if DB fails during build
        productRoutes = SEED_PRODUCTS.map((product) => ({
            url: `${baseUrl}/product/${product.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        }));
    }

    // Dynamic Store Routes
    let storeRoutes: any[] = [];
    try {
        const dbSellers = await db.seller.findMany({
            where: { status: 'active' },
            select: { slug: true, created_at: true },
        });

        storeRoutes = dbSellers.map((seller) => ({
            url: `${baseUrl}/store/${seller.slug}`,
            lastModified: seller.created_at || new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
    } catch (e) {
        storeRoutes = SEED_SELLERS.map((seller) => ({
            url: `${baseUrl}/store/${seller.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
    }

    return [...routes, ...productRoutes, ...storeRoutes];
}
