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
        
        // ─── Policy Filter: Unsupported Content (Vehicles) ───
        // Google restricts passenger vehicles in Merchant Center. 
        // We exclude products in 'cars' category that are actual vehicles, while keeping parts.
        const catLabel = (product.category || 'General').toLowerCase();
        const productName = (product.name || '').toLowerCase();
        const isVehicle = (catLabel === 'cars' || catLabel === 'automotive') && 
                          (productName.includes('toyota') || productName.includes('honda') || productName.includes('car') || productName.includes('tesla') || productName.includes('sedan') || productName.includes('suv') || productName.includes('202') || productName.includes('foreign used'));
        
        // Explicitly block IDs found in GMC warnings
        const blockedIds = ['p120', 'p121', 'p21', 'p4', 'p21'];
        if (isVehicle || blockedIds.includes(product.id)) {
            return ''; 
        }

        const title = escapeXml(`${product.name} (Verified FairPrice)`);
        const description = escapeXml(product.description || `Verify the authentic market price for ${product.name} in Nigeria. Real-time rates aggregated by FairPrice.`);
        
        // ─── Image Refinement: Proxy via our CDN ───
        // We wrap external images in our /api/image-cdn to ensure stable JPEG delivery to Google
        const rawImageUrl = product.image_url || '';
        const isExternal = rawImageUrl.startsWith('http');
        const finalImageUrl = isExternal 
            ? `${baseUrl}/api/image-cdn?url=${encodeURIComponent(rawImageUrl)}`
            : `${baseUrl}/assets/images/placeholder.png`;

        // ─── Attribute Extraction from Specs ───
        const specs = (product.specs || {}) as Record<string, any>;
        const color = specs.Color || specs.color || specs.Colour || specs.colour || '';
        const size = specs.Size || specs.size || specs["Sizes Available"] || specs.Dimensions || '';
        const gender = specs.Gender || specs.gender || (catLabel === 'fashion' ? 'unisex' : '');
        
        // Age group detection
        let ageGroup = 'adult';
        if (catLabel === 'baby' || productName.includes('baby') || productName.includes('kid') || productName.includes('child')) {
            ageGroup = 'kids';
        }

        // Map categories for GMC (Standardized)
        let googleCategory = 'Electronics';
        if (catLabel.includes('phone') || catLabel.includes('telecom')) googleCategory = 'Electronics > Communications > Telephony > Mobile Phones';
        else if (catLabel.includes('fashion') || catLabel.includes('cloth') || catLabel.includes('backpack')) googleCategory = 'Apparel & Accessories > Clothing';
        else if (catLabel.includes('beauty') || catLabel.includes('health')) googleCategory = 'Health & Beauty > Personal Care > Cosmetics';
        else if (catLabel.includes('home') || catLabel.includes('appliance')) googleCategory = 'Home & Garden > Household Appliances';
        else if (catLabel.includes('laptop') || catLabel.includes('computer')) googleCategory = 'Electronics > Computers > Laptops';

        // Extract brand from specs if available
        let brand = product.seller_name || 'FairPrice';
        if (specs.Brand) brand = specs.Brand;
        else if (specs.brand) brand = specs.brand;
        else if (specs.Manufacturer) brand = specs.Manufacturer;

        return `
        <item>
            <g:id>${product.id}</g:id>
            <g:title>${title}</g:title>
            <g:description>${description}</g:description>
            <g:link>${baseUrl}/product/${encodeURIComponent(product.id)}</g:link>
            <g:image_link>${escapeXml(finalImageUrl)}</g:image_link>
            <g:condition>new</g:condition>
            <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
            <g:price>${product.price}.00 NGN</g:price>
            <g:brand>${escapeXml(brand)}</g:brand>
            <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
            
            ${color ? `<g:color>${escapeXml(color)}</g:color>` : ''}
            ${size ? `<g:size>${escapeXml(size)}</g:size>` : ''}
            ${gender ? `<g:gender>${escapeXml(gender)}</g:gender>` : ''}
            <g:age_group>${ageGroup}</g:age_group>
            
            <g:mpn>${product.id}</g:mpn>
            
            <!-- Default Shipping (Nigeria) -->
            <g:shipping>
                <g:country>NG</g:country>
                <g:service>Express Delivery</g:service>
                <g:price>0.00 NGN</g:price>
            </g:shipping>
            
            <!-- International Shipping Entries (To resolve GMC multi-country warnings) -->
            <g:shipping><g:country>US</g:country><g:service>International</g:service><g:price>15000.00 NGN</g:price></g:shipping>
            <g:shipping><g:country>GB</g:country><g:service>International</g:service><g:price>15000.00 NGN</g:price></g:shipping>
            <g:shipping><g:country>CA</g:country><g:service>International</g:service><g:price>18000.00 NGN</g:price></g:shipping>
            <g:shipping><g:country>IE</g:country><g:service>International</g:service><g:price>18000.00 NGN</g:price></g:shipping>

            <g:identifier_exists>no</g:identifier_exists>
        </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
    <channel>
        <title>FairPrice Nigeria - Verified Market Feed</title>
        <link>${baseUrl}</link>
        <description>The definitive source for verified market prices in Nigeria. Verified images via /api/image-cdn proxy.</description>
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
