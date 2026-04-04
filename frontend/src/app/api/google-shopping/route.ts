import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEED_PRODUCTS } from '@/lib/data';

// Set revalidation to 24 hours (86,400 seconds) for Google Crawler performance
export const revalidate = 86400;

export async function GET() {
    const baseUrl = "https://fairprice.ng";
    
    // 1. Fetch products (SEED + DB)
    let allProducts = [...SEED_PRODUCTS];
    try {
        const dbProducts = await db.product.findMany({ 
            where: { isActive: true },
            orderBy: { soldCount: 'desc' },
            take: 500 
        });
        // @ts-ignore
        if (dbProducts.length > 0) {
            // Deduplicate if needed
            const seedIds = new Set(SEED_PRODUCTS.map(p => p.id));
            const filteredDb = dbProducts.filter(p => !seedIds.has(p.id));
            allProducts.push(...filteredDb as any);
        }
    } catch(e) {
        console.error("GMC Feed: Database fetch failed, falling back to seed data.", e);
    }

    // 2. Format into GMC XML (RSS 2.0)
    const xmlItems = allProducts.slice(0, 500).map(product => {
        const title = `${product.name} Price in Nigeria (Verified Market Rate)`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const description = `Verify the authentic market price for ${product.name} in Nigeria. We aggregate real-time rates from Jumia, Konga, and local stores to ensure you never overpay.`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const category = product.category || 'General';
        
        // Map categories for GMC
        let googleCategory = 'Electronics';
        if (category === 'phones') googleCategory = 'Electronics > Communications > Telephony > Mobile Phones';
        if (category === 'fashion') googleCategory = 'Apparel & Accessories > Clothing';
        if (category === 'beauty') googleCategory = 'Health & Beauty > Personal Care > Cosmetics';
        if (category === 'home') googleCategory = 'Home & Garden > Household Appliances';

        return `
        <item>
            <g:id>${product.id}</g:id>
            <g:title>${title}</g:title>
            <g:description>${description}</g:description>
            <g:link>${baseUrl}/product/${product.id}</g:link>
            <g:image_link>${product.image_url}</g:image_link>
            <g:condition>new</g:condition>
            <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
            <g:price>${product.price}.00 NGN</g:price>
            <g:brand>${product.seller_name || 'FairPrice'}</g:brand>
            <g:google_product_category>${googleCategory}</g:google_product_category>
            <g:external_seller_id>${product.seller_id}</g:external_seller_id>
            <g:shipping>
                <g:country>NG</g:country>
                <g:service>Standard</g:service>
                <g:price>0.00 NGN</g:price>
            </g:shipping>
        </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
    <channel>
        <title>FairPrice.ng Product Feed</title>
        <link>${baseUrl}</link>
        <description>The real average market price of products in Nigeria. Verified aggregation of Jumia, Konga, and Jiji.</description>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        ${xmlItems}
    </channel>
</rss>`;

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 's-maxage=86400, stale-while-revalidate',
        },
    });
}
