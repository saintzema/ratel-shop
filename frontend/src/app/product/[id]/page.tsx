import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SEED_PRODUCTS } from '@/lib/data';
import { getProductUrl } from '@/lib/utils';

type Props = {
    params: { id: string }
};

export default async function ProductRedirect({ params }: Props) {
    const decodedId = decodeURIComponent(params.id);
    let productName = "product";
    
    // Attempt to fetch the real product name from DB
    try {
        const dbProduct = await db.product.findUnique({ where: { id: decodedId } });
        if (dbProduct) {
            productName = dbProduct.name;
        }
    } catch(e) { }
    
    // Fallback to static seed data if not found in DB
    if (productName === "product") {
        const seedMatch = SEED_PRODUCTS.find(p => p.id === decodedId || p.id === params.id);
        if (seedMatch) {
            productName = seedMatch.name;
        } else {
            // Also grab from any other potential cache logic if needed, but DB + Local Seeds cover 99% of SSR cases.
            // If we can't find it, we just use 'product' as the slug.
            productName = decodedId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    // 301 Permanent Redirect to the new SEO-friendly slug URL
    redirect(getProductUrl(decodedId, productName));
}
