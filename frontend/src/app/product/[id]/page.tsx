import { Metadata, ResolvingMetadata } from 'next';
import ProductClient from './ProductClient';
import { db } from '@/lib/db';
import { SEED_PRODUCTS } from '@/lib/data';

type Props = {
    params: { id: string }
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const decodedId = decodeURIComponent(params.id);

    // 1. Try DB fetch first (for generated/new products)
    let productDetails = null;
    let price = 0;
    
    try {
        const dbProduct = await db.product.findUnique({
            where: { id: decodedId },
            include: { seller: true }
        });
        if (dbProduct) {
            productDetails = dbProduct;
            price = dbProduct.price;
        }
    } catch(e) { }

    // 2. Fallback to Local/Seed Data for static rendering
    if (!productDetails) {
        const allSeeds = [...SEED_PRODUCTS];
        const seedMatch = allSeeds.find(p => p.id === decodedId || p.id === params.id);
        if (seedMatch) {
            productDetails = seedMatch;
            price = seedMatch.price;
        }
    }

    const titleProductName = productDetails?.name || decodedId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Fallback Price representation
    const formattedPrice = price > 0 ? `₦${price.toLocaleString()}` : "Compare Rates";

    return {
        title: `${titleProductName} Price in Nigeria Today | Jiji vs Konga vs FairPrice`,
        description: `Check the real average market price for ${titleProductName} in Nigeria. Current FairPrice: ${formattedPrice}. Compare current deals, view 30-day price history, and avoid overpaying. Last updated today.`,
        openGraph: {
            title: `${titleProductName} - FairPrice Verification`,
            description: `Verify the market rate for ${titleProductName}. Expertly sourced from FairPrice.`,
            images: ((productDetails as any)?.imageUrl || (productDetails as any)?.image_url) ? [((productDetails as any)?.imageUrl || (productDetails as any)?.image_url)] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: `Best price for ${titleProductName}`,
        }
    };
}

export default function ProductPage() {
    return <ProductClient />;
}
