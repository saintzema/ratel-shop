import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { SEED_PRODUCTS } from '@/lib/data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://fairprice.ng'

  // 1. Static Routes
  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/deals',
    '/categories',
    '/protection',
    '/seller',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // 2. Dynamic Product Routes from DB
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, updatedAt: true }
    })

    productRoutes = products.map((p) => {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      return {
        url: `${baseUrl}/product/${p.id}/${slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }
    })
  } catch (e) {
    console.error('Sitemap DB fetch failed, using seeds:', e)
    // Fallback to seeds if DB fails
    productRoutes = SEED_PRODUCTS.map((p) => {
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        return {
          url: `${baseUrl}/product/${p.id}/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.5,
        }
    })
  }

  return [...staticRoutes, ...productRoutes]
}
