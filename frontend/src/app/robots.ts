import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/seller/dashboard/',
                    '/api/',
                    '/_next/',
                    '/static/',
                ],
            },
        ],
        sitemap: 'https://fairprice.ng/sitemap.xml',
    };
}
