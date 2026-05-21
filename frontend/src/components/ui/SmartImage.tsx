"use client";

/**
 * SmartImage — zero-flicker product image with intelligent fallback chain.
 *
 * Fallback order:
 *  1. Supplied src (CDN-proxied or direct URL)
 *  2. imagePool[productName] — same-query image shared from NavSearch / SRP
 *  3. Background fetch from /api/product-image?q=name&category=cat (async, no blocking)
 *  4. Category icon placeholder (instant, no broken-image state ever shown)
 *
 * The key insight: we never show a "broken image" state.
 * The img element is hidden while loading; a skeleton replaces it.
 * On error we immediately show the category icon, then silently fetch a real URL in the background.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Smartphone, Laptop, Tv, Car, Shirt, Zap, ShoppingBag,
    Box, Dumbbell, Home, Sofa, Gamepad2, Plug, Baby, Package
} from "lucide-react";

interface SmartImageProps {
    src: string | null | undefined;
    alt: string;
    className?: string;
    productName?: string;
    category?: string;
    /** Size for the category icon fallback */
    iconSize?: number;
    /** Pool of name→url to check before fetching */
    imagePool?: Record<string, string>;
    onSrcResolved?: (url: string) => void;
}

const PLACEHOLDER = "/assets/images/placeholder.png";

function CategoryIcon({ category, name, size = 24 }: { category?: string; name?: string; size?: number }) {
    const c = (category || "").toLowerCase();
    const n = (name || "").toLowerCase();
    const cls = `text-gray-300`;
    const s = { width: size, height: size };
    if (c.includes("phone") || n.includes("phone") || n.includes("iphone") || n.includes("samsung")) return <Smartphone style={s} className={cls} />;
    if (c.includes("laptop") || c.includes("computer") || n.includes("laptop") || n.includes("macbook")) return <Laptop style={s} className={cls} />;
    if (c.includes("tv") || c.includes("television") || n.includes(" tv ") || n.includes("smart tv")) return <Tv style={s} className={cls} />;
    if (c.includes("car") || c.includes("vehicle") || n.includes("toyota") || n.includes("honda")) return <Car style={s} className={cls} />;
    if (c.includes("fashion") || c.includes("clothing") || c.includes("shirt")) return <Shirt style={s} className={cls} />;
    if (c.includes("solar") || c.includes("energy") || c.includes("inverter")) return <Zap style={s} className={cls} />;
    if (c.includes("fitness") || c.includes("gym") || n.includes("dumbbell")) return <Dumbbell style={s} className={cls} />;
    if (c.includes("gaming") || n.includes("playstation") || n.includes("xbox")) return <Gamepad2 style={s} className={cls} />;
    if (c.includes("home") || c.includes("kitchen")) return <Home style={s} className={cls} />;
    if (c.includes("furniture") || c.includes("sofa")) return <Sofa style={s} className={cls} />;
    if (c.includes("baby") || c.includes("kids")) return <Baby style={s} className={cls} />;
    if (c.includes("appliance") || c.includes("electronics")) return <Plug style={s} className={cls} />;
    return <Package style={s} className={cls} />;
}

// Module-level in-flight cache: prevent duplicate simultaneous fetches for the same product name
const inFlight = new Map<string, Promise<string | null>>();
// Session-level resolved cache: skip API call if already fetched this session
const resolvedCache = (() => {
    try {
        const raw = sessionStorage.getItem('fp_img_cache');
        return new Map<string, string>(raw ? JSON.parse(raw) : []);
    } catch { return new Map<string, string>(); }
})();

function persistCache() {
    try {
        sessionStorage.setItem('fp_img_cache', JSON.stringify(Array.from(resolvedCache.entries()).slice(-200)));
    } catch { /* quota */ }
}

async function fetchRealImage(name: string, category?: string): Promise<string | null> {
    const key = `${name}__${category || ''}`.toLowerCase();
    if (resolvedCache.has(key)) return resolvedCache.get(key)!;
    if (inFlight.has(key)) return inFlight.get(key)!;

    const p = (async () => {
        try {
            const url = `/api/product-image?q=${encodeURIComponent(name)}&category=${encodeURIComponent(category || '')}&t=${Date.now()}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) return null;
            const data = await res.json();
            const imgUrl: string | null = data.imageUrl || null;
            if (imgUrl) {
                const cdnUrl = `/api/image-cdn?url=${encodeURIComponent(imgUrl)}`;
                resolvedCache.set(key, cdnUrl);
                persistCache();
                return cdnUrl;
            }
            return null;
        } catch { return null; }
        finally { inFlight.delete(key); }
    })();

    inFlight.set(key, p);
    return p;
}

function isInvalidSrc(src: string | null | undefined): boolean {
    if (!src) return true;
    const l = src.toLowerCase();
    return l.includes('placeholder') || l.includes('no photo') || l.includes('n/a') ||
           l.includes('no_image') || l.includes('no-image') ||
           l.includes('grounding') || l.includes('vertexaisearch') || l === '';
}

export function SmartImage({
    src,
    alt,
    className = "",
    productName,
    category,
    iconSize = 32,
    imagePool,
    onSrcResolved,
}: SmartImageProps) {
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
        if (!isInvalidSrc(src)) return src!;
        // Check imagePool synchronously on first render
        if (imagePool && productName) {
            const pooled = imagePool[(productName).toLowerCase().trim()];
            if (pooled && !isInvalidSrc(pooled)) return pooled;
        }
        return null;
    });
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const hydrating = useRef(false);

    const tryHydrate = useCallback(async () => {
        if (!productName || hydrating.current) return;
        hydrating.current = true;
        const real = await fetchRealImage(productName, category);
        if (real) {
            setResolvedSrc(real);
            setFailed(false);
            onSrcResolved?.(real);
        }
    }, [productName, category, onSrcResolved]);

    // When src prop changes, re-evaluate
    useEffect(() => {
        if (!isInvalidSrc(src)) {
            setResolvedSrc(src!);
            setLoaded(false);
            setFailed(false);
        } else if (imagePool && productName) {
            const pooled = imagePool[(productName).toLowerCase().trim()];
            if (pooled && !isInvalidSrc(pooled)) {
                setResolvedSrc(pooled);
                setLoaded(false);
                setFailed(false);
                return;
            }
            tryHydrate();
        } else {
            tryHydrate();
        }
    }, [src, productName, imagePool]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLoad = () => setLoaded(true);

    const handleError = () => {
        setLoaded(false);
        setFailed(true);
        // Kick off background hydration
        if (productName) tryHydrate();
    };

    // Show category icon while no image is resolved or if everything failed
    if (!resolvedSrc || (failed && !resolvedSrc)) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
                <CategoryIcon category={category} name={productName} size={iconSize} />
            </div>
        );
    }

    return (
        <div className={`relative ${className}`} style={{ overflow: 'hidden' }}>
            {/* Skeleton shown until image loads */}
            {!loaded && (
                <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}
            <img
                src={resolvedSrc}
                alt={alt}
                className={`w-full h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
            />
        </div>
    );
}
