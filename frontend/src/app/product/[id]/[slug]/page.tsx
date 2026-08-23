import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { db } from '@/lib/db';
import { mapDbProductToClient } from '@/lib/product-mapper';

export const revalidate = 3600;
import { SEED_PRODUCTS } from '@/lib/data';
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
                    url: (() => {
                        const raw = (productDetails as any)?.imageUrl || (productDetails as any)?.image_url;
                        if (!raw || raw.startsWith('data:')) return 'https://www.fairprice.ng/logo.png';
                        if (raw.startsWith('http')) return `https://www.fairprice.ng/api/image-cdn?url=${encodeURIComponent(raw)}`;
                        return `https://www.fairprice.ng${raw.startsWith('/') ? '' : '/'}${raw}`;
                    })(),
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
    let dbProductRaw: any = null;

    // Fetch for Schema mapping AND for server-authoritative hydration of the client.
    // Including the seller here means the client receives the SAME data on every device,
    // instead of rebuilding it from per-device localStorage.
    try {
        dbProductRaw = await db.product.findUnique({
            where: { id: decodedId },
            include: {
                seller: {
                    select: {
                        businessName: true,
                        status: true,
                        verified: true,
                        rating: true,
                        trustScore: true,
                        createdAt: true,
                        subscriptionPlan: true,
                    },
                },
            },
        });
        if (dbProductRaw) productDetails = dbProductRaw;
    } catch(e) {}

    if (!productDetails) {
        productDetails = SEED_PRODUCTS.find(p => p.id === decodedId || p.id === resolvedParams.id);
    }

    // Server-authoritative product passed into the client. DB product preferred; seed
    // product as fallback for statically-known catalog. Global/unknown ids resolve client-side.
    const initialProduct = dbProductRaw
        ? mapDbProductToClient(dbProductRaw)
        : (productDetails || null);

    // SEO: return a real 404 for genuinely dead product IDs (e.g. old temu_*, p33) instead
    // of rendering a thin page Google flags as a "Soft 404". The global auto-generated PDP
    // feature uses ids prefixed with "global-"/"global_", so those are preserved.
    const isGlobalAutoGen = /^global[-_]/i.test(decodedId);
    if (!productDetails && !isGlobalAutoGen) {
        notFound();
    }

    // REAL reviews only, straight from the database.
    //
    // This used to read DEMO_REVIEWS — seed data with invented authors
    // ("Chidi O."), invented bodies, and verified_purchase: true — and published
    // it to Google as genuine Review structured data on every product page.
    // Fabricated reviews are a structured-data policy violation that risks a
    // manual action against the whole domain, and they are worse than the
    // fabricated ratingValue below because they attribute made-up words to
    // named people. Products with no reviews now emit no review markup at all,
    // which is the correct and compliant state.
    let productReviews: Array<{ user_name: string; rating: number; body: string; title: string; created_at: string }> = [];
    try {
        const rows = await db.review.findMany({
            where: { productId: decodedId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { userName: true, rating: true, body: true, title: true, createdAt: true },
        });
        productReviews = rows.map(r => ({
            user_name: r.userName,
            rating: r.rating,
            body: r.body,
            title: r.title,
            created_at: r.createdAt.toISOString(),
        }));
    } catch {
        // DB unreachable — emit no review markup rather than falling back to
        // anything invented.
        productReviews = [];
    }

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

    // Extract color from product name suffix (e.g. "iPhone 15 Pro Max — Natural Titanium")
    const productName = productDetails?.name || '';
    const colorMatch = productName.match(/[—–-]\s*([A-Za-z][A-Za-z\s]{2,30})$/);
    const extractedColor = colorMatch ? colorMatch[1].trim() : null;

    // Map product specs to schema.org additionalProperty (what GMC reads for
    // Front/Rear Camera Resolution, RAM, Screen Size, Screen Resolution, Weight, etc.)
    const specs = (productDetails as any)?.specs as Record<string, string> | null | undefined;
    const GMC_SPEC_MAP: Record<string, string> = {
        'RAM':                  'RAM',
        'Storage':              'Storage Capacity',
        'Camera':               'Rear Camera Resolution',
        'Front Camera':         'Front Camera Resolution',
        'Screen Size':          'Screen Size',
        'Display Size':         'Screen Size',
        'Screen Resolution':    'Screen Resolution',
        'Display Resolution':   'Screen Resolution',
        'Weight':               'Weight',
        'Battery':              'Battery Capacity',
        'Processor':            'Processor',
        'CPU Model':            'Processor',
        'Connectivity':         'Connectivity',
        'Operating System':     'Operating System',
        'OS':                   'Operating System',
        'Water Resistance':     'Water Resistance',
    };
    const additionalProperty = specs
        ? Object.entries(specs)
            .filter(([, v]) => v && String(v).trim())
            .map(([k, v]) => ({
                '@type': 'PropertyValue',
                name: GMC_SPEC_MAP[k] || k,
                value: String(v).trim(),
            }))
        : undefined;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productDetails?.name || 'Product',
        // schema.org/Product accepts an array, and Google prefers several images per
        // offer (Merchant Center grades "Images per offer"). Previously only the single
        // primary image was emitted even when the product had a full gallery.
        image: (() => {
            const primary = (productDetails as any)?.imageUrl || (productDetails as any)?.image_url;
            const gallery = ((productDetails as any)?.images || []) as string[];
            const all = [primary, ...gallery].filter(
                (u, i, arr) => typeof u === 'string' && u.startsWith('http') && arr.indexOf(u) === i
            );
            return all.length ? all.slice(0, 10) : ['https://www.fairprice.ng/logo.png'];
        })(),
        description: productDetails?.description || 'Price verification and secure marketplace for premium products in Nigeria.',
        sku: productDetails?.id,
        ...(extractedColor ? { color: extractedColor } : {}),
        ...(additionalProperty?.length ? { additionalProperty } : {}),
        brand: {
            '@type': 'Brand',
            name: (specs?.Brand) || 'FairPrice Shop',
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
        // Gate on ACTUAL reviews we hold, not on a review_count column that can be
        // non-zero while we have no reviews to show. The old ratingValue ended in
        // `|| 4.5`, so that mismatch published an invented 4.5-star rating.
        ...(productReviews.length > 0 ? {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1),
                reviewCount: productReviews.length,
                bestRating: 5,
                worstRating: 1,
            },
            review: productReviews.map(r => ({
                '@type': 'Review',
                author: { '@type': 'Person', name: r.user_name },
                datePublished: r.created_at,
                // Omitted when empty — a star-only rating (left via the Ziva
                // post-delivery prompt) is a valid Review with just a
                // reviewRating, and an empty reviewBody string is not.
                ...(r.body ? { reviewBody: r.body } : {}),
                reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 }
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
            <ProductClient initialProduct={initialProduct} />
        </>
    );
}
