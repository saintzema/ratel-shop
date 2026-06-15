import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const revalidate = 3600;
import { SEED_PRODUCTS } from '@/lib/data';
import { getProductUrl } from '@/lib/utils';

type Props = {
    params: Promise<{ id: string }>
};

export default async function ProductRedirect({ params }: Props) {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    let productName = decodedId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Attempt to fetch the real product name from DB
    try {
        const dbProduct = await db.product.findUnique({ where: { id: decodedId }, select: { name: true, slug: true } as any }) as any;
        if (dbProduct) {
            productName = dbProduct.name;
            return redirect(getProductUrl(decodedId, productName, dbProduct.slug || undefined));
        } else {
            const seedMatch = SEED_PRODUCTS.find(p => p.id === decodedId);
            if (seedMatch) {
                productName = seedMatch.name;
            }
        }
    } catch(e) { }
    
    // Fallback to static seed data if not found in DB
    if (productName === "product") {
        const seedMatch = SEED_PRODUCTS.find(p => p.id === decodedId || p.id === id);
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
