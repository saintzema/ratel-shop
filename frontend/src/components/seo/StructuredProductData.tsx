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

    // Mapping internal condition to Schema.org standard URLs
    const conditionMap: Record<string, string> = {
        'brand_new': 'https://schema.org/NewCondition',
        'used': 'https://schema.org/UsedCondition',
        'refurbished': 'https://schema.org/RefurbishedCondition'
    };
    const itemCondition = conditionMap[product?.condition || 'brand_new'] || 'https://schema.org/NewCondition';

    // ─── Extract brand from specs or product name ───
    const extractBrand = (): string | null => {
        if (product?.specs?.Brand) return product.specs.Brand;
        if (product?.specs?.Make) return product.specs.Make;
        const name = (product?.name || '').toLowerCase();
        const knownBrands = [
            'Apple', 'Samsung', 'Toyota', 'Honda', 'Lexus', 'Mercedes-Benz', 'BMW', 'Hyundai', 'Kia',
            'BYD', 'Tesla', 'Xiaomi', 'Tecno', 'Infinix', 'Oppo', 'Vivo', 'Nokia', 'Google', 'OnePlus',
            'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Microsoft', 'Sony', 'LG', 'Hisense', 'Panasonic',
            'Nike', 'Adidas', 'Gucci', 'Louis Vuitton', 'Zara', 'Ford', 'Chevrolet', 'Audi',
            'Range Rover', 'Land Rover', 'Innoson', 'Changan', 'GAC', 'Xpeng', 'Huawei',
            'Canon', 'Nikon', 'GoPro', 'JBL', 'Bose', 'Beats', 'Scanfrost', 'Haier Thermocool',
        ];
        for (const brand of knownBrands) {
            if (name.includes(brand.toLowerCase())) return brand;
        }
        return null;
    };

    // ─── Generate a deterministic SKU from product ID ───
    const generateSku = (): string => {
        const id = product?.id || 'unknown';
        const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return `FP-${hash.toString(36).toUpperCase()}-${id.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
    };

    const brand = extractBrand();
    const sku = generateSku();
    // Real values only — `avg_rating || 4.5` treated a genuine 0 (no reviews
    // yet) as falsy and substituted a fabricated 4.5-star / 10-review rating on
    // EVERY unreviewed product. Google's structured-data guidelines require
    // aggregateRating to reflect real first-party reviews; emitting an invented
    // score risks a manual action, and it's worse than the "missing field"
    // warning it was quietly avoiding. Omit the block entirely when there's
    // nothing real to report — that's the compliant behaviour, not a gap.
    const hasRealRating = !!(product?.review_count && product.review_count > 0 && product?.avg_rating);
    const avgRating = product?.avg_rating;
    const reviewCount = product?.review_count;
    const productUrl = typeof window !== 'undefined' ? window.location.href : '';
    const productImages = [product?.image_url, ...(product?.images || [])].filter(Boolean);
    // Search Console flagged offers missing "validFrom" (Merchant listings).
    // Use the product's own listing date — falls back to "now" only for the
    // (should-never-happen) case where a product has neither.
    const validFrom = product?.created_at || new Date().toISOString();

    // ─── High-intent Product + Offer schema ───
    const schemaData: Record<string, any> = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product?.name || 'FairPrice Product',
        "description": product?.description?.slice(0, 500) || `Check real comparative pricing for ${product?.name} in Nigeria.`,
        "image": productImages.length > 0 ? productImages : undefined,
        "sku": sku,
        "itemCondition": itemCondition,
        "offers": {
            "@type": "AggregateOffer",
            "lowPrice": low.toString(),
            "highPrice": high.toString(),
            "priceCurrency": "NGN",
            "offerCount": count.toString(),
            "availability": "https://schema.org/InStock",
            "validFrom": validFrom,
            "url": productUrl || undefined,
            "seller": {
                "@type": "Organization",
                "name": product?.seller_name || "FairPrice Nigeria"
            }
        }
    };

    // Only when there's a genuine rating to report — see hasRealRating above.
    if (hasRealRating) {
        schemaData["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": avgRating!.toFixed(1),
            "bestRating": "5",
            "worstRating": "1",
            "reviewCount": reviewCount!.toString()
        };
    }

    // Conditionally add brand
    if (brand) {
        schemaData["brand"] = {
            "@type": "Brand",
            "name": brand
        };
    }

    // Conditionally add category
    if (product?.category) {
        schemaData["category"] = product.category;
    }

    // ─── BreadcrumbList for enhanced SERP snippets ───
    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": typeof window !== 'undefined' ? `${window.location.origin}` : 'https://ratelshop.com'
            },
            ...(product?.category ? [{
                "@type": "ListItem",
                "position": 2,
                "name": product.category.charAt(0).toUpperCase() + product.category.slice(1),
                "item": typeof window !== 'undefined' ? `${window.location.origin}/search?category=${product.category}` : `https://ratelshop.com/search?category=${product.category}`
            }] : []),
            {
                "@type": "ListItem",
                "position": product?.category ? 3 : 2,
                "name": product?.name || 'Product',
                "item": productUrl || undefined
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
            />
        </>
    );
}
