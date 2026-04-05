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
    const xmlItems = allProducts.slice(0, 1000).map(product => {
        // Escaping helper for XML safety
        const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        
        const title = escapeXml(`${product.name} (Verified FairPrice)`);
        const description = escapeXml(product.description || `Verify the authentic market price for ${product.name} in Nigeria. Real-time rates aggregated by FairPrice.`);
        const categoryLabel = (product.category || 'General').toLowerCase();
        
        // Extract brand from specs if available
        let brand = product.seller_name || 'FairPrice';
        if (product.specs && typeof product.specs === 'object') {
            const specs = product.specs as Record<string, any>;
            if (specs.Brand) brand = specs.Brand;
            else if (specs.brand) brand = specs.brand;
            else if (specs.Manufacturer) brand = specs.Manufacturer;
        }

        // Map categories for GMC (Standardized)
        let googleCategory = 'Electronics';
        if (categoryLabel.includes('phone') || categoryLabel.includes('telecom')) googleCategory = 'Electronics > Communications > Telephony > Mobile Phones';
        else if (categoryLabel.includes('fashion') || categoryLabel.includes('cloth')) googleCategory = 'Apparel & Accessories > Clothing';
        else if (categoryLabel.includes('beauty') || categoryLabel.includes('health')) googleCategory = 'Health & Beauty > Personal Care > Cosmetics';
        else if (categoryLabel.includes('home') || categoryLabel.includes('appliance')) googleCategory = 'Home & Garden > Household Appliances';
        else if (categoryLabel.includes('laptop') || categoryLabel.includes('computer')) googleCategory = 'Electronics > Computers > Laptops';

        return `
        <item>
            <g:id>${product.id}</g:id>
            <g:title>${title}</g:title>
            <g:description>${description}</g:description>
            <g:link>${baseUrl}/product/${encodeURIComponent(product.id)}</g:link>
            <g:image_link>${escapeXml(product.image_url || '')}</g:image_link>
            <g:condition>new</g:condition>
            <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
            <g:price>${product.price}.00 NGN</g:price>
            <g:brand>${escapeXml(brand)}</g:brand>
            <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
            <g:mpn>${product.id}</g:mpn>
            <g:shipping>
                <g:country>NG</g:country>
                <g:service>Express Delivery</g:service>
                <g:price>0.00 NGN</g:price>
            </g:shipping>
        </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
    <channel>
        <title>FairPrice Nigeria - Verified Market Feed</title>
        <link>${baseUrl}</link>
        <description>The definitive source for verified market prices in Nigeria. Real-time data from FairPrice.ng aggregation.</description>
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
