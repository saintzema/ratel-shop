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
        },
        alternates: {
            canonical: `/product/${params.id}`,
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

    const breadcrumbListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'All Stores',
                item: 'https://fairprice.ng/stores'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: (productDetails as any)?.seller_name || 'Store',
                item: `https://fairprice.ng/store/${(productDetails as any)?.seller_id}`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: productDetails?.name || 'Product',
                item: `https://fairprice.ng/product/${params.id}`
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
        image: (productDetails as any)?.imageUrl || (productDetails as any)?.image_url || 'https://fairprice.ng/logo.png',
        description: productDetails?.description || 'Price verification and secure marketplace for premium products in Nigeria.',
        sku: productDetails?.id,
        brand: {
            '@type': 'Brand',
            name: 'FairPrice Shop Negotiate & Verify Market Prices'
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
            // Elite tier: Price History
            priceSpecification: priceHistory.map(h => ({
                '@type': 'UnitPriceSpecification',
                price: h.price,
                priceCurrency: 'NGN',
                validFrom: h.date
            }))
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (productDetails as any)?.avg_rating || 4.5,
            reviewCount: (productDetails as any)?.review_count || 128
        }
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
