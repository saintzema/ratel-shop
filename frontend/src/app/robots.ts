import { MetadataRoute } from 'next'

// Private/duplicate areas every crawler should skip.
const COMMON_DISALLOW = [
  '/admin/',
  '/account/',
  '/seller/dashboard',
  '/seller/products',
  '/seller/orders',
  '/seller/settings',
  '/seller/onboarding',
  '/checkout',
  '/cart',
  '/login',
  '/signup',
  '/reset-password',
  '/order-confirmation',
  '/search', // infinite/duplicate query URLs — keep out of the index
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Google Merchant Center REQUIRES explicit Googlebot + Googlebot-Image rules and
      // crawlable product images. Product images are served via /api/image-cdn, so these
      // bots must be allowed to reach it even though /api/ is otherwise blocked.
      {
        userAgent: 'Googlebot',
        allow: ['/', '/api/image-cdn'],
        disallow: COMMON_DISALLOW,
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/', '/api/image-cdn'],
        disallow: ['/admin/', '/account/', '/seller/dashboard'],
      },
      // Everyone else: block all of /api/ (only the image proxy is whitelisted for Google).
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', ...COMMON_DISALLOW],
      },
    ],
    sitemap: 'https://www.fairprice.ng/sitemap.xml',
    host: 'https://www.fairprice.ng',
  }
}
