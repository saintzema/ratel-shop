import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { SEED_PRODUCTS, SEED_SELLERS } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://fairprice.ng';

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

    // Dynamic Routes (Temporarily use Fallback/Seed Data to fix Turbopack build panic)
    const productRoutes = SEED_PRODUCTS.map((product) => ({
        url: `${baseUrl}/product/${product.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    const storeRoutes = SEED_SELLERS.map((seller) => ({
        url: `${baseUrl}/store/${seller.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    return [...routes, ...productRoutes, ...storeRoutes];
}
