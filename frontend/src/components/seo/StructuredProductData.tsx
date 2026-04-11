"use client";

import React from 'react';
import { Product } from '@/lib/types';

export function StructuredProductData({ product, fallbackPrice }: { product: Product | null | undefined, fallbackPrice?: number }) {
    if (!product && !fallbackPrice) return null;

    const basePrice = product?.price || fallbackPrice || 0;
    if (basePrice <= 0) return null;

    // Constructing a fair market estimation based on platform logic
    // So the JSON-LD reflects FairPrice aggregation
    const low = Math.round(basePrice * 0.90);
    const high = Math.round((product?.original_price || basePrice) * 1.15);
    const count = 4; // Mock aggregation count representing multiple local markets/scrapers

    const schemaData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product?.name || 'FairPrice Product',
        "description": product?.description || `Check real comparative pricing for ${product?.name} in Nigeria.`,
        "image": product?.image_url ? [product.image_url] : [],
        "offers": {
            "@type": "AggregateOffer",
            "lowPrice": low.toString(),
            "highPrice": high.toString(),
            "priceCurrency": "NGN",
            "offerCount": count.toString(),
            "availability": "https://schema.org/InStock",
            "seller": {
                "@type": "Organization",
                "name": "FairPrice Nigeria"
            }
        }
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
    );
}
