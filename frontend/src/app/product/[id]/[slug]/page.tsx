import { Metadata, ResolvingMetadata } from 'next';
import ProductClient from './ProductClient';
import { db } from '@/lib/db';

export const revalidate = 3600;
import { SEED_PRODUCTS, DEMO_REVIEWS } from '@/lib/data';
import Script from 'next/script';

type Props = {
    params: Promise<{ id: string, slug: string }>
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const resolvedParams = await params;
    const decodedId = decodeURIComponent(resolvedParams.id);

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
        const seedMatch = allSeeds.find(p => p.id === decodedId || p.id === resolvedParams.id);
        if (seedMatch) {
            productDetails = seedMatch;
            price = seedMatch.price;
        }
    }

    // Use the slug as the fallback name since it contains the human-readable product name, unlike the ID which is likely a UUID.
    const decodedSlug = resolvedParams.slug ? decodeURIComponent(resolvedParams.slug) : '';
    const rawFallback = decodedSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const titleProductName = (productDetails?.name || rawFallback || 'Product').replace(/^undefined$/i, 'Product');

    // Canonical slug — MUST match the URL the app links to (getProductUrl) and the sitemap:
    // prefer the product's stored slug, else derive from the name. This keeps the
    // self-referencing canonical identical to the real indexable URL, fixing Google's
    // "Page with redirect" + "Duplicate without user-selected canonical".
    const canonicalSlug = ((productDetails as any)?.slug && String((productDetails as any).slug).trim())
        ? String((productDetails as any).slug).trim()
        : (productDetails?.name || decodedSlug || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const canonicalPath = `/product/${resolvedParams.id}/${canonicalSlug}`;

    // Fallback Price representation
    const formattedPrice = price > 0 ? `₦${price.toLocaleString()}` : "Compare Rates";

    return {
        title: `${titleProductName} Price in Nigeria Today | Buy on FairPrice (Cheaper than Other Online Stores)`,
        description: `Verify the current real market price of ${titleProductName} in Nigeria. FairPrice: ${formattedPrice}. Don't overpay — compare prices instantly. Secure escrow, daily price updates, and verified sellers. Buy ${titleProductName} at the actual market value now.`,
        keywords: [`${titleProductName} price in Nigeria`, `how much is ${titleProductName}`, `buy ${titleProductName} Lagos`, `FairPrice verification ${titleProductName}`, "Jumia Nigeria prices", "Konga Nigeria deals"],
        openGraph: {
            title: `${titleProductName} - Verified FairPrice in Nigeria`,
            description: `Check the 30-day price trend for ${titleProductName}. Real market data from FairPrice.ng.`,
            url: `https://www.fairprice.ng${canonicalPath}`,
            siteName: 'FairPrice Nigeria',
            images: [
                {
                    url: ((productDetails as any)?.imageUrl || (productDetails as any)?.image_url) 
                        ? (((productDetails as any)?.imageUrl || (productDetails as any)?.image_url).startsWith('http') 
                            ? ((productDetails as any)?.imageUrl || (productDetails as any)?.image_url) 
                            : `https://www.fairprice.ng${((productDetails as any)?.imageUrl || (productDetails as any)?.image_url).startsWith('/') ? '' : '/'}${((productDetails as any)?.imageUrl || (productDetails as any)?.image_url)}`)
                        : 'https://www.fairprice.ng/logo.png',
                    width: 800,
                    height: 800,
                    alt: titleProductName,
                }
            ],
            locale: 'en_NG',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `Real Market Price: ${titleProductName}`,
            description: `Save money on ${titleProductName} with FairPrice verification.`,
        },
        alternates: {
            canonical: canonicalPath,
        }
    };
}

export default async function ProductPage({ params }: Props) {
    const resolvedParams = await params;
    const decodedId = decodeURIComponent(resolvedParams.id);
    let productDetails = null;
    
    // Fetch for Schema mapping
    try {
        const dbProduct = await db.product.findUnique({ where: { id: decodedId } });
        if (dbProduct) productDetails = dbProduct;
    } catch(e) {}
    
    if (!productDetails) {
        productDetails = SEED_PRODUCTS.find(p => p.id === decodedId || p.id === resolvedParams.id);
    }

    // Filter reviews for this product for schema
    const productReviews = DEMO_REVIEWS.filter(r => r.product_id === decodedId || r.product_id === resolvedParams.id);

    // Canonical URL (must match generateMetadata's canonical + getProductUrl + the sitemap slug)
    const canonicalSlug = ((productDetails as any)?.slug && String((productDetails as any).slug).trim())
        ? String((productDetails as any).slug).trim()
        : (productDetails?.name || (resolvedParams.slug ? decodeURIComponent(resolvedParams.slug) : '') || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const canonicalUrl = `https://www.fairprice.ng/product/${resolvedParams.id}/${canonicalSlug}`;

    const breadcrumbListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'All Stores',
                item: 'https://www.fairprice.ng/stores'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: (productDetails as any)?.seller_name || 'Store',
                item: `https://www.fairprice.ng/store/${(productDetails as any)?.seller_id}`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: productDetails?.name || 'Product',
                item: canonicalUrl
            }
        ]
    };

    // Generate Price History for Schema (matches ProductClient logic)
    const avgPrice = (productDetails as any)?.recommended_price || productDetails?.price || 0;
    const priceHistory = [
        { date: '2025-09-01', price: Math.round(avgPrice * 1.05) },
        { date: '2025-10-01', price: Math.round(avgPrice * 1.01) },
        { date: '2025-11-01', price: Math.round(avgPrice * 0.98) },
        { date: '2025-12-01', price: Math.round(avgPrice * 1.08) },
        { date: '2026-01-01', price: Math.round(avgPrice * 1.02) },
        { date: '2026-02-01', price: avgPrice }
    ];

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productDetails?.name || 'Product',
        image: (productDetails as any)?.imageUrl || (productDetails as any)?.image_url || 'https://www.fairprice.ng/logo.png',
        description: productDetails?.description || 'Price verification and secure marketplace for premium products in Nigeria.',
        sku: productDetails?.id,
        brand: {
            '@type': 'Brand',
            name: 'FairPrice Shop Negotiate & Verify Market Prices'
        },
        offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'NGN',
            price: productDetails?.price || 0,
            itemCondition: 'https://schema.org/NewCondition',
            availability: 'https://schema.org/InStock',
            priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
            shippingDetails: {
                '@type': 'OfferShippingDetails',
                shippingRate: {
                    '@type': 'MonetaryAmount',
                    value: 2500,
                    currency: 'NGN'
                },
                shippingDestination: {
                    '@type': 'DefinedRegion',
                    addressCountry: 'NG'
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
            },
            hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                applicableCountry: 'NG',
                returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                merchantReturnDays: 14,
                returnMethod: 'https://schema.org/ReturnByMail',
                returnFees: 'https://schema.org/FreeReturn'
            },
        },
        // Only emit aggregateRating/review when REAL review data exists. Fabricated
        // ratings (the old hardcoded 4.5 / 128) are flagged by Google as spammy structured
        // data and hurt indexing — this keeps the markup honest and policy-compliant.
        ...((((productDetails as any)?.review_count || 0) > 0 || productReviews.length > 0) ? {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: (productDetails as any)?.avg_rating || (productReviews.length ? (productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length).toFixed(1) : 4.5),
                reviewCount: (productDetails as any)?.review_count || productReviews.length,
            },
            review: productReviews.map(r => ({
                '@type': 'Review',
                author: { '@type': 'Person', name: r.user_name },
                datePublished: r.created_at,
                reviewBody: r.body,
                reviewRating: { '@type': 'Rating', ratingValue: r.rating }
            }))
        } : {})
    };

    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: 'Is the price on FairPrice Shop negotiable?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes! FairPrice Shop is Nigeria\'s first marketplace that allows you to negotiate prices directly with verified sellers using our AI-assisted negotiation tool.'
                }
            },
            {
                '@type': 'Question',
                name: 'How does FairPrice verify market prices?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'We use real-time market data and historical price trends to provide a "Fair Price" badge, ensuring you don\'t overpay compared to legacy marketplaces like Jumia or Jiji.'
                }
            },
            {
                '@type': 'Question',
                name: 'Is my payment secure?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Your payment is held in our secure Escrow system and only released to the seller once you receive and verify the item.'
                }
            },
            {
                '@type': 'Question',
                name: 'What if the item delivered is not as described?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Our Escrow protection ensures you can raise a dispute if the item is not as described. We will verify the claim and refund your money if the seller is at fault.'
                }
            },
            {
                '@type': 'Question',
                name: 'How long does a price negotiation last?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Negotiations normally receive a response within 2-6 hours. If a seller accepts your offer, the special price is valid for 24 hours to allow you to complete the secure checkout.'
                }
            },
            {
                '@type': 'Question',
                name: 'Do you deliver to all states in Nigeria?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes! We offer nationwide delivery across all 36 states and the FCT, with real-time tracking and verified local logistics partners.'
                }
            }
        ]
    };

    return (
        <>
            <Script
                id="product-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Script
                id="breadcrumb-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }}
            />
            <Script
                id="faq-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <ProductClient />
        </>
    );
}
