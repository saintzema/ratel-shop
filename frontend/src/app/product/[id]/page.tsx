import { Metadata, ResolvingMetadata } from 'next';
import ProductClient from './ProductClient';
import { db } from '@/lib/db';
import { SEED_PRODUCTS } from '@/lib/data';
import Script from 'next/script';

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
        title: `${titleProductName} Price in Nigeria Today | Buy on FairPrice (Cheaper than Jumia & Konga)`,
        description: `Verify the current real market price of ${titleProductName} in Nigeria. FairPrice: ${formattedPrice}. Don't overpay on Jiji or Temu. Secure escrow, daily price updates, and verified sellers. Buy ${titleProductName} at the actual market value now.`,
        keywords: [`${titleProductName} price in Nigeria`, `how much is ${titleProductName}`, `buy ${titleProductName} Lagos`, `FairPrice verification ${titleProductName}`, "Jumia Nigeria prices", "Konga Nigeria deals"],
        openGraph: {
            title: `${titleProductName} - Verified FairPrice in Nigeria`,
            description: `Check the 30-day price trend for ${titleProductName}. Real market data from FairPrice.ng.`,
            images: ((productDetails as any)?.imageUrl || (productDetails as any)?.image_url) ? [((productDetails as any)?.imageUrl || (productDetails as any)?.image_url)] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: `Real Market Price: ${titleProductName}`,
            description: `Save money on ${titleProductName} with FairPrice verification.`,
        }
    };
}

export default async function ProductPage({ params }: Props) {
    const decodedId = decodeURIComponent(params.id);
    let productDetails = null;
    
    // Fetch for Schema mapping
    try {
        const dbProduct = await db.product.findUnique({ where: { id: decodedId } });
        if (dbProduct) productDetails = dbProduct;
    } catch(e) {}
    
    if (!productDetails) {
        productDetails = SEED_PRODUCTS.find(p => p.id === decodedId || p.id === params.id);
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productDetails?.name || 'Product',
        image: (productDetails as any)?.imageUrl || (productDetails as any)?.image_url || 'https://fairprice.ng/logo.png',
        description: productDetails?.description || 'Price verification for products in Nigeria',
        sku: productDetails?.id,
        brand: {
            '@type': 'Brand',
            name: 'FairPrice Verified'
        },
        offers: {
            '@type': 'Offer',
            url: `https://fairprice.ng/product/${params.id}`,
            priceCurrency: 'NGN',
            price: productDetails?.price || 0,
            itemCondition: 'https://schema.org/NewCondition',
            availability: 'https://schema.org/InStock',
            priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
            shippingDetails: {
                '@type': 'OfferShippingDetails',
                shippingRate: {
                    '@type': 'MonetaryAmount',
                    value: 0,
                    currency: 'NGN'
                },
                deliveryTime: {
                    '@type': 'ShippingDeliveryTime',
                    handlingTime: {
                        '@type': 'QuantitativeValue',
                        minValue: 0,
                        maxValue: 1,
                        unitCode: 'DAY'
                    },
                    transitTime: {
                        '@type': 'QuantitativeValue',
                        minValue: 1,
                        maxValue: 3,
                        unitCode: 'DAY'
                    }
                }
            }
        }
    };

    return (
        <>
            <Script
                id="product-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductClient />
        </>
    );
}
