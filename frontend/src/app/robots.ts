import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block private/duplicate/non-content areas so Google spends its crawl budget
        // on indexable product, store, and category pages.
        disallow: [
          '/admin/',
          '/api/',
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
          '/search', // search-result URLs are infinite/duplicate — keep them out of the index
        ],
      },
    ],
    sitemap: 'https://www.fairprice.ng/sitemap.xml',
    host: 'https://www.fairprice.ng',
  }
}
