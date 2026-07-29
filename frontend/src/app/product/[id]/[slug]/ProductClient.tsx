"use client";

import { useParams, useRouter } from "next/navigation";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { SEED_PRODUCTS, SEED_SELLERS, DEMO_REVIEWS, SEED_DEALS, getDemoPriceComparison } from "@/lib/data";
import { DataSyncService } from "@/lib/sync-store";
import { formatPrice, getProxiedImageUrl, getProductUrl, cn, isVideoUrl, copyToClipboard } from "@/lib/utils";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { SearchGridCard } from "@/components/product/SearchGridCard";
import { StructuredProductData } from "@/components/seo/StructuredProductData";
import { PriceGraphWidget } from "@/components/product/PriceGraphWidget";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { RecommendedProducts } from "@/components/ui/RecommendedProducts";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { NegotiationModal } from "@/components/modals/NegotiationModal";
import { PriceIntelModal } from "@/components/modals/PriceIntelModal";
import { hasFinancing, isVehicle, calculateMonthlyPayment, getVehicleDepositPercent } from "@/lib/financing-utils";
import { FinancingDetailsModal } from "@/components/modals/FinancingDetailsModal";
import { FinancingOffer } from "@/components/financing/FinancingOffer";
import { motion, AnimatePresence } from "framer-motion";
import {
    Handshake,
    MessageSquare,
    Tag,
    ShoppingCart,
    Heart,
    Share2,
    ChevronRight,
    ChevronLeft,
    ShieldCheck,
    Truck,
    RotateCcw,
    Star,
    MapPin,
    Info,
    Gavel,
    AlertTriangle,
    Lock,
    CheckCircle2,
    Check,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Send,
    Bot,
    User,
    Zap,
    Phone,
    Monitor,
    Shirt,
    Car,
    Gamepad2,
    Home as HomeIcon,
    Sofa,
    Baby,
    Dumbbell,
    BookOpen,
    Wrench,
    Paintbrush,
    ShoppingBag,
    Package,
    Plus,
    Minus,
    Banknote,
    CreditCard,
    TrendingUp,
    X,
    QrCode,
    Crown,
    Loader2
} from "lucide-react";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { LocationModal } from "@/components/modals/LocationModal";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { SectionSkeleton } from "@/components/ui/SectionSkeleton";

// Calculate real delivery date range skipping weekends
function getDeliveryDateRange(minDays: number, maxDays: number): { start: string; end: string } {
    const addBusinessDays = (from: Date, days: number): Date => {
        const result = new Date(from);
        let added = 0;
        while (added < days) {
            result.setDate(result.getDate() + 1);
            const dow = result.getDay();
            if (dow !== 0 && dow !== 6) added++;
        }
        return result;
    };
    const fmt = (d: Date) => d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' });
    const now = new Date();
    return { start: fmt(addBusinessDays(now, minDays)), end: fmt(addBusinessDays(now, maxDays)) };
}

// ─── Ask Ziva AI helper ──────────────────────────────────────
function generateZivaAnswers(product: typeof SEED_PRODUCTS[0]): { question: string; answer: string }[] {
    if (!product) return [];
    const specs = product.specs || {};
    const qa: { question: string; answer: string }[] = [];

    if (specs.Battery) qa.push({ question: "How long does the battery last?", answer: `The ${specs["Model Name"] || product.name} has a ${specs.Battery} battery. ${product.highlights?.[product.highlights.length - 1] || ""}` });
    if (specs.Camera) qa.push({ question: "How good is the camera?", answer: `It features a ${specs.Camera} camera system. ${product.highlights?.find(h => h.toLowerCase().includes("camera")) || "Great for everyday photography and professional shots."}` });
    if (specs["Water Resistance"]) qa.push({ question: "Is it water resistant?", answer: `Yes, it has ${specs["Water Resistance"]} water resistance rating.` });
    if (specs.Connectivity) qa.push({ question: "What connectivity options does it have?", answer: `It supports ${specs.Connectivity}.` });
    if (specs.Storage) qa.push({ question: `How much storage does it have?`, answer: `It comes with ${specs.Storage} of storage.` });
    if (specs.RAM) qa.push({ question: "How much RAM does it have?", answer: `It features ${specs.RAM} RAM${specs["CPU Model"] ? ` powered by the ${specs["CPU Model"]} processor` : ""}.` });
    if (specs.Warranty) qa.push({ question: "Does it come with a warranty?", answer: `Yes, this product comes with a ${specs.Warranty} warranty.` });
    if (specs.Brand) qa.push({ question: `Is this an authentic ${specs.Brand} product?`, answer: `Yes, this is an authentic ${specs.Brand} product sold by ${product.seller_name}. ${specs.Authentication ? specs.Authentication + "." : ""}` });

    // Always add image request and shipping questions
    const isGlobal = product.id?.startsWith('global-') || product.seller_id === 'global-partners';
    qa.push({
        question: "📷 Request product images",
        answer: isGlobal
            ? `I'm searching for high-quality images of the ${product.name}. Our concierge team has been notified and will upload product images shortly. You'll receive a notification when they're available. In the meantime, the product specifications above should give you a good overview of what to expect!`
            : product.image_url
                ? `You can see the product images in the gallery above! Swipe or click the arrows to view all available photos of the ${product.name}.`
                : `Product images are being sourced for the ${product.name}. Our team has been notified and will update the listing shortly. You'll receive a notification when images are available!`
    });

    qa.push({ question: "How fast is delivery?", answer: "Most orders are delivered within 2-5 business days. Free delivery is available to major cities across Nigeria." });

    return qa.slice(0, 7);
}


export default function ProductDetailPage({ initialProduct = null }: { initialProduct?: any }) {
    const params = useParams();
    const id = params?.id as string;
    const { location, setLocation } = useLocation();
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const { user } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isFinancingModalOpen, setIsFinancingModalOpen] = useState(false);
    const [loadedMore, setLoadedMore] = useState(false);
    // -1 = base product selected (no add-on/variant), ≥0 = a specific variant/bundle
    const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(-1);
    const [revealedContact, setRevealedContact] = useState<{ business_name: string; whatsapp_number: string | null; phone_number: string | null } | null>(null);
    const [contactLoading, setContactLoading] = useState(false);
    const [contactError, setContactError] = useState("");

    // Pagination states
    const [visibleReviewsCount, setVisibleReviewsCount] = useState(3);
    const [visibleProductsCount, setVisibleProductsCount] = useState(8);
    const [visibleCABCount, setVisibleCABCount] = useState(8);

    // Review Submission States
    const [isWritingReview, setIsWritingReview] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 0, title: "", body: "" });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Seller Reply States
    const [replyingToReviewId, setReplyingToReviewId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    const [isFetchingGlobalData, setIsFetchingGlobalData] = useState(false);
    const [storeVersion, setStoreVersion] = useState(0);
    const [fetchedProduct, setFetchedProduct] = useState<any>(null);
    const [isFetchingFull, setIsFetchingFull] = useState(false);
    const [aiReviews, setAiReviews] = useState<any[]>([]);
    const [showQrModal, setShowQrModal] = useState(false);
    const [isDeferredReady, setIsDeferredReady] = useState(false);
    const [fetchedSellerLogoUrl, setFetchedSellerLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        const handleStorageChange = () => setStoreVersion(v => v + 1);
        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("sync-store-update", handleStorageChange);

        // Progressive hydration: delay heavy components to improve TTI
        const timer = setTimeout(() => setIsDeferredReady(true), 150);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("sync-store-update", handleStorageChange);
            clearTimeout(timer);
        };
    }, []);

    // Use DataSyncService for live product data (includes seller-added products).
    // getProducts()/getSellers() re-parse the entire catalog from localStorage — calling
    // them directly in the component body (not memoized) meant every single re-render of
    // this page (typing, opening a modal, hovering a thumbnail — anything) re-parsed the
    // whole catalog synchronously on the main thread. storeVersion only changes when the
    // catalog actually updates, so that's the right dependency to gate recomputation on.
    const allProducts = useMemo(() => {
        const rawProducts = DataSyncService.getProducts();
        // ID-based unique product list to prevent duplicate cards
        return Array.from(new Map(rawProducts.map(p => [p.id, p])).values());
    }, [storeVersion]);
    const allSellers = useMemo(() => DataSyncService.getSellers(), [storeVersion]);

    // Hydration-safe views of the above: DataSyncService.getProducts()/getSellers()
    // read localStorage directly and already return [] on the server (window is
    // undefined there). But on the very first CLIENT render — the hydration pass,
    // before the `mounted` effect below has run — window IS defined, so these would
    // return real cached data immediately, diverging from what the server rendered
    // and producing a hydration mismatch (different product/seller/price/image, or
    // different similar-product lists). Treat them as empty until we're past that
    // first paint so the initial client render is textually identical to the SSR HTML.
    const safeAllProducts = mounted ? allProducts : [];
    const safeAllSellers = mounted ? allSellers : [];

    // Decode URI-encoded IDs (e.g. "AirPods%20Pro%203" → "AirPods Pro 3")
    const decodedId = id ? decodeURIComponent(id) : id;

    // 1. Initial lookup from all sources
    const cachedProduct = safeAllProducts.find((p) => p.id === decodedId) || safeAllProducts.find((p) => p.id === id) || SEED_PRODUCTS.find((p) => p.id === decodedId) || SEED_PRODUCTS.find((p) => p.id === id) || SEED_DEALS.map(d => d.product).find((p) => p.id === decodedId || p.id === id);

    // 2. Resolution priority (server-authoritative first):
    //    fetchedProduct (fresh /api fetch) > initialProduct (server-rendered, identical
    //    across devices) > cachedProduct (per-device localStorage/seed fallback).
    //    Using initialProduct before localStorage is what fixes the cross-device
    //    "same URL, different product" bug.
    // Non-downgrading resolution: the freshest record wins for descriptive fields,
    // but a zero price or placeholder image must NEVER overwrite a real price/image
    // that another source already has. This stops the lazy /api fetch (which can
    // return a degraded global row) from clobbering the server-rendered ₦/image and
    // triggering a wrong AI re-hydration. Backfill only fires when the winner is
    // degraded, so legitimate price/image updates still flow through untouched.
    let product = (() => {
        const primary = fetchedProduct || initialProduct || cachedProduct;
        if (!primary) return primary;
        const sources = [fetchedProduct, initialProduct, cachedProduct].filter(Boolean) as any[];
        const isPlaceholderImg = (u: any) =>
            !u || typeof u !== "string" || !u.startsWith("http") || /placeholder|logo\.png/i.test(u);
        const betterPriced = sources.find((s) => Number(s.price) > 0);
        const betterImaged = sources.find((s) => !isPlaceholderImg(s.image_url));
        return {
            ...primary,
            price: Number(primary.price) > 0 ? primary.price : (betterPriced?.price ?? primary.price),
            original_price: Number(primary.price) > 0 ? primary.original_price : (betterPriced?.original_price ?? primary.original_price),
            recommended_price: Number(primary.price) > 0 ? primary.recommended_price : (betterPriced?.recommended_price ?? primary.recommended_price),
            image_url: !isPlaceholderImg(primary.image_url) ? primary.image_url : (betterImaged?.image_url ?? primary.image_url),
            images: (primary.images?.length ? primary.images : betterImaged?.images) ?? primary.images,
        };
    })();

    // 3. Lazy fetch full details when product is missing from localStorage or lacks description
    useEffect(() => {
        if (!mounted || isFetchingFull) return;

        const fetchId = !product ? decodedId : (!product.description ? product.id : null);
        if (!fetchId) return;

        const getFullDetails = async () => {
            setIsFetchingFull(true);
            try {
                const res = await fetch(`/api/products/${encodeURIComponent(fetchId)}`);
                if (res.ok) {
                    const full = await res.json();
                    if (!full.error) setFetchedProduct(full);
                }
            } catch (e) {
                console.error("Full product fetch failed:", e);
            } finally {
                setIsFetchingFull(false);
            }
        };
        getFullDetails();
    }, [product, isFetchingFull, mounted, decodedId]);

    // Direct seller fetch when localStorage doesn't have the seller's logo yet.
    // This ensures cross-device avatar display without waiting for a full sync cycle.
    useEffect(() => {
        if (!mounted || !product?.seller_id) return;
        const cachedSeller = DataSyncService.getSellers().find((s: any) => s.id === product.seller_id);
        if (cachedSeller?.logo_url && !cachedSeller.logo_url.includes('placeholder')) return;
        let cancelled = false;
        fetch(`/api/sellers/${encodeURIComponent(product.seller_id)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!cancelled && data && (data.logoUrl || data.logo_url)) {
                    const url = data.logo_url || data.logoUrl;
                    if (url && !url.includes('placeholder')) setFetchedSellerLogoUrl(url);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [mounted, product?.seller_id]);

    // Canonicalize global products: if this is a global-* product that ISN'T already
    // backed by a server/DB record (no initialProduct), persist it to the DB once we
    // have GOOD data (real price + real, non-placeholder image). This closes the
    // direct-link / shared-URL path so every device converges on the same record.
    // Quality-gated so we never lock in a placeholder. Endpoint is idempotent.
    const persistedGlobalRef = useRef(false);
    useEffect(() => {
        if (!mounted || initialProduct) return; // initialProduct => already in DB
        if (persistedGlobalRef.current) return;
        const pid: string | undefined = product?.id || decodedId;
        if (!pid || !/^global[-_]/i.test(pid)) return;
        if (!product || !(product.price > 0)) return;
        const img: string | undefined = product.image_url || product.images?.[0];
        const goodImage = typeof img === 'string' && img.startsWith('http')
            && !img.includes('placeholder') && !img.includes('logo.png');
        if (!goodImage) return;
        persistedGlobalRef.current = true;
        fetch('/api/products/global', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: { ...product, id: pid } }),
        }).catch(() => {});
    }, [mounted, initialProduct, product?.id, product?.price, product?.image_url, decodedId]);

    // Auto-hydrate global product from URL if missing from store cache
    if (!product && (decodedId?.startsWith('global_') || decodedId?.startsWith('global-'))) {
        // id format: "global-airpods-pro-2" or legacy "global_samsung_galaxy_s24_ultra"
        const namePart = decodedId.replace(/^global[-_]/, '').replace(/[-_]/g, ' ');
        const nameTokens = namePart.toLowerCase().split(' ').filter(Boolean);

        // Try to find a matching product already stored in DataSyncService by name similarity.
        // Gated by `mounted` for the same hydration-safety reason as safeAllProducts above.
        const allStored = mounted ? DataSyncService.getProducts() : [];
        const matchByName = allStored.find(p => {
            const pName = p.name.toLowerCase();
            // Match if all significant tokens from the ID appear in the product name
            return nameTokens.length >= 2 && nameTokens.every(t => pName.includes(t));
        });

        if (matchByName) {
            product = matchByName;
        } else {
            // Helper functions for description and specs generation
            const generateDescription = (n: string): string => {
                const nl = n.toLowerCase();
                if (/iphone|samsung|galaxy|pixel|redmi|xiaomi|oppo|vivo|phone|smartphone/.test(nl)) {
                    return `Experience premium performance with the ${n}. Featuring a stunning edge-to-edge display, pro-grade camera system for capturing every detail in vivid clarity, and an all-day battery that keeps up with your lifestyle. Built with aerospace-grade materials for durability, this device offers smooth multitasking, fast 5G connectivity, and advanced security features including Face ID and fingerprint recognition. Whether you're gaming, streaming, or working on the go, this smartphone delivers flagship performance at an exceptional value.`;
                }
                if (/macbook|laptop|thinkpad|chromebook|notebook|dell|hp elitebook|surface/.test(nl)) {
                    return `Unleash your productivity with the ${n}. This powerhouse laptop features a brilliant high-resolution display, lightning-fast processor, and generous storage for all your files and applications. The premium aluminum body is both lightweight and durable, perfect for professionals who need performance on the go. With an advanced thermal management system, backlit keyboard, and long-lasting battery life, this laptop is designed for demanding workloads from creative editing to software development.`;
                }
                if (/airpods|earbuds|headphone|earphone|buds|headset|sony wh|beats/.test(nl)) {
                    return `Immerse yourself in crystal-clear sound with the ${n}. Featuring advanced Active Noise Cancellation technology that blocks out the world, premium drivers for rich bass and detailed highs, and a comfortable ergonomic design for all-day wear. Seamless Bluetooth 5.3 connectivity ensures stable, low-latency audio for music, calls, and gaming. With industry-leading battery life and a compact charging case, these deliver audiophile-quality sound wherever you go.`;
                }
                if (/watch|smartwatch|apple watch|galaxy watch|fitbit/.test(nl)) {
                    return `Stay connected and track your health with the ${n}. This advanced smartwatch features a always-on AMOLED display, comprehensive health monitoring including heart rate, blood oxygen, and sleep tracking, plus built-in GPS for accurate workout mapping. Water-resistant design, customizable watch faces, and smart notifications keep you informed without reaching for your phone. With multi-day battery life and fast charging, it's the perfect companion for an active lifestyle.`;
                }
                if (/tv|television|monitor|display|screen/.test(nl)) {
                    return `Transform your entertainment with the ${n}. Enjoy breathtaking 4K resolution with HDR support that brings movies, sports, and games to life with vivid colors and deep contrast. Smart TV capabilities give you instant access to streaming apps, while powerful built-in speakers deliver immersive audio. The sleek, minimal-bezel design complements any living space. Multiple HDMI ports and Wi-Fi connectivity make setup effortless.`;
                }
                if (/shoe|sneaker|nike|adidas|jordan|yeezy|boot|sandal/.test(nl)) {
                    return `Step up your style with the ${n}. Crafted with premium materials and expert construction for lasting comfort and durability. The cushioned midsole provides responsive support for all-day wear, while the breathable upper keeps your feet cool. Whether you're hitting the gym, exploring the city, or elevating a casual outfit, these deliver the perfect blend of performance and streetwear aesthetics.`;
                }
                if (/bag|backpack|luggage|suitcase|handbag|purse/.test(nl)) {
                    return `Carry in style with the ${n}. Designed with premium materials and thoughtful organization, featuring multiple compartments for laptops, tablets, and everyday essentials. Padded straps ensure comfortable carrying, while water-resistant fabric protects your gear in any weather. The modern, versatile design transitions seamlessly from work to weekend adventures.`;
                }
                if (/camera|canon|nikon|sony alpha|gopro|drone/.test(nl)) {
                    return `Capture stunning moments with the ${n}. Featuring a high-resolution sensor for sharp, detailed images in any lighting condition, fast autofocus for action shots, and professional-grade video capabilities. Intuitive controls and a bright LCD screen make framing perfect shots effortless. Built for both enthusiasts and professionals who demand exceptional image quality and reliability.`;
                }
                if (/massager|massage|percussion|deep tissue|muscle/.test(nl)) {
                    return `Relieve tension and accelerate recovery with the ${n}. Engineered with multiple speed settings and interchangeable massage heads to target every muscle group — from deep tissue knots to gentle relaxation. The powerful yet whisper-quiet brushless motor delivers up to 3,200 percussions per minute, penetrating deep into sore muscles to increase blood circulation and reduce recovery time. Lightweight, ergonomic design with a long-lasting rechargeable battery means you can enjoy professional-grade therapy at home, at the gym, or on the go.`;
                }
                if (/chopper|slicer|blender|mixer|kitchen|grater|peeler|juicer|food processor/.test(nl)) {
                    return `Simplify your meal prep with the ${n}. This versatile kitchen essential features precision-engineered stainless steel blades for effortless chopping, slicing, dicing, and grating. The ergonomic, non-slip design ensures safe and comfortable use, while the removable components make cleanup a breeze. Built to handle everything from delicate herbs to tough root vegetables, it saves you valuable time in the kitchen without sacrificing quality or consistency in every cut.`;
                }
                if (/car.*vacuum|car.*seat|dash.*cam|car.*charger|car.*mount|steering|tire|windshield|car.*paint|car.*wax/.test(nl)) {
                    return `Upgrade your driving experience with the ${n}. Designed specifically for automotive use with durable, high-quality materials built to withstand daily wear and extreme temperatures. Easy installation requires no professional help, and the sleek design blends seamlessly with any vehicle interior. Whether you're maintaining your car's appearance, enhancing safety, or adding convenience, this accessory delivers reliable performance and lasting value for drivers who refuse to compromise.`;
                }
                if (/gaming|rgb|controller|joystick|game.*pad|thumb.*grip/.test(nl)) {
                    return `Level up your gaming setup with the ${n}. Designed for serious gamers who demand precision, comfort, and style. Features responsive controls with minimal input lag, immersive RGB lighting with multiple customizable effects, and an ergonomic build for marathon gaming sessions. Compatible with multiple platforms and devices, this accessory gives you the competitive edge you need to dominate every match.`;
                }
                if (/fitness|resistance.*band|yoga.*mat|push.*up|jump.*rope|dumbbell|kettlebell|workout/.test(nl)) {
                    return `Take your fitness to the next level with the ${n}. Built from premium, sweat-resistant materials designed for intense workouts and long-term durability. Whether you're training at home, outdoors, or at the gym, this equipment provides the versatility and resistance you need for effective full-body workouts. Compact, portable design makes it easy to stay consistent with your fitness goals anywhere, anytime.`;
                }
                if (/led.*light|night.*light|lamp|cabinet.*light|strip.*light|bulb|chandelier/.test(nl)) {
                    return `Illuminate your space with the ${n}. Features energy-efficient LED technology that delivers warm, eye-friendly lighting while consuming minimal power. Easy to install with no wiring required — the smart design includes adjustable brightness and automatic sensors for hands-free convenience. Perfect for bedrooms, hallways, closets, kitchens, and workspaces, it combines modern aesthetics with practical everyday functionality.`;
                }
                if (/scrubber|cleaning|mop|vacuum.*cleaner|duster|window.*clean|brush/.test(nl)) {
                    return `Make cleaning effortless with the ${n}. This powerful cleaning tool features a high-torque motor and interchangeable brush heads designed for kitchens, bathrooms, floors, and hard-to-reach areas. The cordless, rechargeable design gives you freedom of movement without tangled cords, while the waterproof construction allows safe use in wet environments. Spend less time scrubbing and more time enjoying a sparkling clean home.`;
                }
                if (/organizer|storage.*box|shelf|rack|container|stackable|drawer/.test(nl)) {
                    return `Maximize your space with the ${n}. Crafted from durable, food-safe materials (where applicable) with a smart stackable design that keeps your belongings neatly organized. Transparent construction lets you quickly identify contents, while reinforced handles and secure locking mechanisms ensure easy handling and spill-proof storage. Perfect for refrigerators, pantries, closets, offices, and more — transform cluttered spaces into tidy, efficient storage solutions.`;
                }
                if (/surveillance|security.*cam|cctv|spy.*cam|hidden.*cam|wifi.*cam|ip.*cam/.test(nl)) {
                    return `Protect what matters most with the ${n}. This compact security camera delivers crisp HD video with advanced night vision, wide-angle coverage, and smart motion detection alerts sent directly to your phone. Easy Wi-Fi setup takes minutes with no professional installation required. Features cloud and local storage, two-way audio for real-time communication, and a discreet design that blends into any environment. Keep your home, office, or business monitored 24/7 from anywhere in the world.`;
                }
                if (/hair.*clipper|trimmer|shaver|razor|grooming|beard/.test(nl)) {
                    return `Achieve a precision grooming experience with the ${n}. Featuring self-sharpening stainless steel blades for clean, even cuts every time. Multiple length settings and guide combs provide versatility for any hairstyle or beard shape. The powerful yet quiet motor, rechargeable battery with USB-C charging, and waterproof design make it perfect for use at home or on the go. Professional results without the salon price tag.`;
                }
                if (/humidifier|diffuser|air.*purifier|fan|cooler|heater|dehumidifier/.test(nl)) {
                    return `Create the perfect atmosphere with the ${n}. Combining innovative technology with elegant design, this device quietly regulates your environment for optimal comfort. Features smart auto-shutoff safety, adjustable mist or airflow settings, and ultra-quiet operation that won't disturb your sleep or work. Energy-efficient and easy to maintain, it's the perfect addition to bedrooms, offices, and living spaces for improved air quality and comfort year-round.`;
                }
                if (/neck.*brace|knee.*brace|back.*support|ankle.*support|wrist.*brace|splint|posture.*correct|orthopedic|compress|bandage|elbow.*sleeve|shoulder.*brace/.test(nl)) {
                    return `Support your body's natural healing with the ${n}. Ergonomically designed to provide firm yet comfortable support exactly where you need it. The breathable, skin-friendly material allows all-day wear without irritation, while the adjustable straps ensure a secure, customized fit for any body size. Recommended by physiotherapists for pain relief, injury recovery, and daily posture support. Lightweight and discreet enough to wear under clothing at work, during exercise, or while sleeping.`;
                }
                if (/pot|pan|cookware|frying|baking|kettle|pressure.*cook|air.*fryer|oven|toaster|grill|induction/.test(nl)) {
                    return `Elevate your cooking with the ${n}. Crafted from high-quality, food-grade materials for even heat distribution and long-lasting durability. The non-stick coating ensures easy food release and effortless cleanup, while the heat-resistant handles provide a safe, comfortable grip. Compatible with all cooktop types including induction, gas, and electric. Whether you're a beginner or a seasoned chef, this kitchen essential delivers consistent results for every meal.`;
                }
                if (/pet|dog|cat|collar|leash|pet.*bed|pet.*bowl|aquarium|fish.*tank|bird/.test(nl)) {
                    return `Give your pet the care they deserve with the ${n}. Made from safe, non-toxic materials that prioritize your pet's comfort and well-being. The durable construction withstands daily use, while the thoughtful design makes it practical for pet owners. Easy to clean and maintain, it's a reliable addition to any pet-friendly home that both you and your furry friend will love.`;
                }
                if (/drill|wrench|hammer|plier|screwdriver|saw|tool.*kit|tool.*set|socket|tape.*measure|level/.test(nl)) {
                    return `Get the job done right with the ${n}. Engineered for professionals and DIY enthusiasts alike, featuring hardened steel construction for maximum durability and precision. The ergonomic grip reduces hand fatigue during extended use, while the compact design fits easily into any toolbox. Whether you're tackling home repairs, renovations, or professional projects, this tool delivers reliable performance you can count on.`;
                }
                // Smart generic fallback — extracts key details from the product name itself
                {
                    const words = n.split(/\s+/).filter(w => w.length > 2);
                    const productType = words.slice(-Math.min(3, words.length)).join(' ') || "product";
                    
                    return `The ${n} is a premium ${productType.toLowerCase()} designed to elevate your everyday experience. Built with high-quality materials and thoughtful craftsmanship, it offers exceptional reliability and longevity. Its intuitive design makes it incredibly easy to use, while its robust construction ensures dependable performance for daily use across Nigeria. The ${productType.toLowerCase()} incorporates strict quality standards, providing complete satisfaction and peace of mind for buyers.

This item boasts excellent utility, delivering outstanding results and a smooth, seamless experience. It provides substantial value, allowing for consistent use without compromising on quality. Featuring a highly practical configuration, it effortlessly adapts to your needs. The carefully optimized design is tailored specifically for its category, ensuring it meets all your expectations effortlessly.

The ${n} is perfect for discerning individuals, households, and anyone looking for a high-quality, efficient solution. It’s ideal for upgrading your daily routine, enhancing productivity, and making life more convenient. Its versatile form-factor makes it highly adaptable, while its efficient design saves time and reduces effort. This product is also an excellent choice for families or businesses needing a dependable essential for daily tasks.

Inside your package, you'll find the ${n} along with standard manufacturer inclusions for immediate setup. The ${productType.toLowerCase()} represents exceptional value, offering impressive durability, everyday practicality, and a host of premium benefits at a competitive price point, making it a smart and sustainable choice for buyers on FairPrice.`;
                }
            };

            const generateSpecs = (n: string): Record<string, string> => {
                const nl = n.toLowerCase();
                if (/iphone/.test(nl)) {
                    const model = nl.includes('pro max') ? 'Pro Max' : nl.includes('pro') ? 'Pro' : 'Standard';
                    return { "Display": model === 'Pro Max' ? '6.7" Super Retina XDR OLED' : '6.1" Super Retina XDR OLED', "Processor": "A17 Pro / A18 Bionic Chip", "RAM": model === 'Standard' ? "6GB" : "8GB", "Storage": "256GB", "Camera": model !== 'Standard' ? "48MP Main + 12MP Ultra Wide + 12MP Telephoto" : "48MP Main + 12MP Ultra Wide", "Battery": model === 'Pro Max' ? "4,685 mAh" : "3,349 mAh", "OS": "iOS 18", "Connectivity": "5G, Wi-Fi 6E, Bluetooth 5.3, NFC", "Biometrics": "Face ID", "Weight": model === 'Pro Max' ? "227g" : "187g" };
                }
                if (/samsung|galaxy s2[0-9]/.test(nl)) {
                    return { "Display": '6.8" Dynamic AMOLED 2X, 120Hz', "Processor": "Snapdragon 8 Gen 3", "RAM": "12GB", "Storage": "256GB", "Camera": "200MP Main + 12MP Ultra Wide + 50MP Telephoto", "Battery": "5,000 mAh", "OS": "Android 14, One UI 6.1", "Connectivity": "5G, Wi-Fi 7, Bluetooth 5.3", "Biometrics": "Ultrasonic Fingerprint", "Weight": "232g" };
                }
                if (/airpods|earbuds|buds/.test(nl)) {
                    return { "Driver": "Custom high-excursion driver", "ANC": "Active Noise Cancellation", "Battery (Buds)": "Up to 6 hours", "Battery (Case)": "Up to 30 hours total", "Connectivity": "Bluetooth 5.3", "Water Resistance": "IPX4", "Charging": "USB-C, MagSafe Wireless", "Audio Features": "Spatial Audio, Adaptive EQ", "Weight": "5.3g per earbud" };
                }
                if (/macbook|laptop/.test(nl)) {
                    return { "Display": '14.2" Liquid Retina XDR', "Processor": "Apple M3 Pro / Intel Core i7", "RAM": "16GB", "Storage": "512GB SSD", "Battery": "Up to 18 hours", "Ports": "HDMI, MagSafe, Thunderbolt, SD Card", "Weight": "1.55 kg", "OS": "macOS Sonoma" };
                }
                // Smart generic specs — extract meaningful details from product name
                const words = n.split(/\s+/).filter(w => w.length > 2);
                const guessedType = words.slice(-Math.min(2, words.length)).join(' ');
                return { "Type": guessedType, "Material": "Premium Quality", "Condition": "Brand New", "Shipping": "Express Delivery (2-5 Business Days)", "Returns": "30-Day Return Policy", "Payment": "Secure Escrow Protection" };
            };

            // Check search cache for this product (has real price from global search).
            // Gated by `mounted` — same hydration-safety reason as safeAllProducts above.
            const cachedProducts = mounted ? DataSyncService.getAllCachedProducts() : [];
            const cachedMatch = cachedProducts.find((p: any) => p.id === decodedId) ||
                cachedProducts.find((p: any) => {
                    const pName = p.name?.toLowerCase() || '';
                    return nameTokens.length >= 2 && nameTokens.every((t: string) => pName.includes(t));
                });

            if (cachedMatch) {
                // Use cached data for render (persist deferred to useEffect)
                product = cachedMatch as any;
            } else {
                // Check sessionStorage for search results (backup source of truth)
                let sessionMatch: any = null;
                if (mounted && typeof window !== 'undefined') {
                    try {
                        const sessionResults = JSON.parse(sessionStorage.getItem('fp_nav_search_results') || '[]');
                        sessionMatch = sessionResults.find((p: any) => p.id === decodedId) ||
                            sessionResults.find((p: any) => {
                                const pName = p.name?.toLowerCase() || '';
                                return nameTokens.length >= 2 && nameTokens.every((t: string) => pName.includes(t));
                            });
                    } catch { }
                }

                if (sessionMatch && sessionMatch.price > 0) {
                    product = {
                        ...sessionMatch,
                        id: decodedId,
                        description: sessionMatch.description || generateDescription(sessionMatch.name || namePart.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')),
                        specs: sessionMatch.specs && Object.keys(sessionMatch.specs).length > 0 ? sessionMatch.specs : generateSpecs(sessionMatch.name || namePart),
                        is_active: true,
                        created_at: sessionMatch.created_at || new Date().toISOString(),
                    } as any;
                } else {
                    // Last resort: create a rich placeholder from the URL slug
                    const name = namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                    // DO NOT generate a random price here. This was causing unrealistic prices (like 75k Lexus).
                    // We will initialize with 0 and let the AI hydration below fetch the real market price.
                    product = {
                        id: decodedId,
                        name,
                        price: 0, 
                        original_price: 0,
                        category: DataSyncService.normalizeCategory("electronics").category,
                        description: generateDescription(name),
                        image_url: "",
                        images: [],
                        seller_id: 'global-partners',
                        seller_name: 'Global Stores',
                        price_flag: 'fair',
                        sold_count: 0,
                        review_count: 0,
                        avg_rating: 0,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        recommended_price: 0,
                        specs: generateSpecs(name),
                    } as any;

                    // Persist deferred to useEffect below
                }
            }
        }
    }

    let seller = safeAllSellers.find((s) => s.id === product?.seller_id) || SEED_SELLERS.find((s) => s.id === product?.seller_id);
    const resolvedLogoUrl = seller?.logo_url && !seller.logo_url.includes('placeholder')
        ? seller.logo_url
        : fetchedSellerLogoUrl || null;
    const logoToUse = resolvedLogoUrl ? getProxiedImageUrl(resolvedLogoUrl) : null;

    // Fallback for global sourcing products if global-partners isn't in older localStorage DataSyncService caches
    if (!seller && product?.seller_id === "global-partners") {
        seller = {
            id: "global-partners",
            user_id: "global_partner",
            business_name: "Global Partners",
            description: "Verified global products sourced through FairPrice AI and protected by our Escrow system.",
            logo_url: "/assets/images/placeholder.png",
            category: "electronics",
            verified: true,
            rating: 4.9,
            trust_score: 99,
            status: "active",
            kyc_status: "approved",
            created_at: "2026-01-01T00:00:00Z",
        } as any;
    }

    // Fallback for any product whose seller isn't registered (e.g. temu marketplace sellers)
    if (!seller && product) {
        seller = {
            id: product.seller_id,
            user_id: product.seller_id,
            business_name: product.seller_name || "Global Partner Stores",
            description: `Verified marketplace seller on FairPrice. All purchases are protected by our Escrow system.`,
            logo_url: "/assets/images/placeholder.png",
            category: product.category || "electronics",
            verified: true,
            rating: 4.7,
            trust_score: 95,
            status: "active",
            kyc_status: "approved",
            created_at: "2026-01-01T00:00:00Z",
        } as any;
    }

    const isVehicleListing = product?.category === 'cars' || product?.category === 'vehicles';
    const isGlobalStore = product?._source || product?.seller_id === 'global-partners' || product?.id?.startsWith('global-');
    const showFraudWarning = isVehicleListing && !isGlobalStore;
    const sellerLocation = seller?.city && seller?.state ? `${seller.city}, ${seller.state}` : seller?.location || seller?.street_address;

    // Enhance generic/boilerplate descriptions with richer category-specific content
    if (product && product.description) {
        const GENERIC_PATTERNS = [
            /explore this highly-rated/i,
            /premium quality.*secure checkout/i,
            /verified for fair pricing/i,
            /guaranteed quality delivery/i,
        ];
        const isGeneric = GENERIC_PATTERNS.some(p => p.test(product!.description)) || product.description.length < 80;
        if (isGeneric) {
            const generateEnhancedDescription = (n: string): string => {
                const nl = n.toLowerCase();
                if (/iphone|samsung|galaxy|pixel|redmi|xiaomi|oppo|vivo|phone|smartphone/.test(nl)) return `Experience premium performance with the ${n}. Featuring a stunning edge-to-edge display, pro-grade camera system for capturing every detail in vivid clarity, and an all-day battery that keeps up with your lifestyle. Built with aerospace-grade materials for durability, offering smooth multitasking, fast 5G connectivity, and advanced security features.`;
                if (/macbook|laptop|thinkpad|chromebook|notebook|dell|hp elitebook|surface/.test(nl)) return `Unleash your productivity with the ${n}. This powerhouse laptop features a brilliant high-resolution display, lightning-fast processor, and generous storage. Premium aluminum body, advanced thermal management, backlit keyboard, and long-lasting battery life — designed for demanding workloads.`;
                if (/airpods|earbuds|headphone|earphone|buds|headset/.test(nl)) return `Immerse yourself in crystal-clear sound with the ${n}. Featuring advanced Active Noise Cancellation, premium drivers for rich bass, and comfortable ergonomic design for all-day wear. Seamless Bluetooth 5.3 connectivity and industry-leading battery life.`;
                if (/watch|smartwatch|fitbit/.test(nl)) return `Stay connected and track your health with the ${n}. Advanced AMOLED display, comprehensive health monitoring including heart rate, blood oxygen, and sleep tracking, plus built-in GPS. Water-resistant with multi-day battery life.`;
                if (/tv|television|monitor|display|screen/.test(nl)) return `Transform your entertainment with the ${n}. Breathtaking 4K resolution with HDR support, smart TV capabilities for instant access to streaming apps, and powerful built-in speakers for immersive audio.`;
                if (/shoe|sneaker|nike|adidas|jordan|boot|sandal|slider/.test(nl)) return `Step up your style with the ${n}. Crafted with premium materials for lasting comfort and durability. Cushioned midsole provides responsive support for all-day wear with breathable upper construction.`;
                if (/bag|backpack|luggage|suitcase|handbag|purse|shoulder.*bag/.test(nl)) return `Carry in style with the ${n}. Premium materials, thoughtful organization with multiple compartments, padded straps for comfortable carrying, and water-resistant fabric for all-weather protection.`;
                if (/camera|canon|nikon|gopro|drone/.test(nl)) return `Capture stunning moments with the ${n}. High-resolution sensor for sharp images, fast autofocus for action shots, and professional-grade video capabilities.`;
                if (/massager|massage|percussion|deep tissue|muscle/.test(nl)) return `Relieve tension and accelerate recovery with the ${n}. Multiple speed settings and interchangeable massage heads target every muscle group. Powerful yet whisper-quiet motor delivers up to 3,200 percussions per minute with a long-lasting rechargeable battery.`;
                if (/chopper|slicer|blender|mixer|kitchen|grater|juicer|food processor/.test(nl)) return `Simplify your meal prep with the ${n}. Precision-engineered stainless steel blades for effortless chopping, slicing, dicing, and grating. Ergonomic non-slip design with easy-clean removable components.`;
                if (/car.*vacuum|car.*seat|dash.*cam|car.*charger|car.*paint|car.*wax/.test(nl)) return `Upgrade your driving experience with the ${n}. Durable, high-quality materials built for daily automotive use. Easy installation, sleek design, and reliable performance for drivers who refuse to compromise.`;
                if (/gaming|rgb|controller|joystick|thumb.*grip/.test(nl)) return `Level up your gaming setup with the ${n}. Responsive controls with minimal input lag, immersive RGB lighting, and ergonomic design for marathon gaming sessions. Multi-platform compatible.`;
                if (/fitness|resistance.*band|yoga.*mat|push.*up|jump.*rope|workout/.test(nl)) return `Take your fitness to the next level with the ${n}. Premium sweat-resistant materials designed for intense workouts and long-term durability. Compact, portable design for training anywhere.`;
                if (/led.*light|night.*light|lamp|cabinet.*light|strip.*light/.test(nl)) return `Illuminate your space with the ${n}. Energy-efficient LED technology delivering warm, eye-friendly lighting with adjustable brightness and smart sensors.`;
                if (/scrubber|cleaning|mop|vacuum.*cleaner|window.*clean/.test(nl)) return `Make cleaning effortless with the ${n}. High-torque motor and interchangeable heads for kitchens, bathrooms, and hard-to-reach areas. Cordless rechargeable design with waterproof construction.`;
                if (/organizer|storage.*box|stackable|container/.test(nl)) return `Maximize your space with the ${n}. Durable materials with smart stackable design. Transparent construction for quick identification with secure locking mechanisms.`;
                if (/surveillance|security.*cam|cctv|wifi.*cam/.test(nl)) return `Protect what matters most with the ${n}. Crisp HD video with night vision, wide-angle coverage, and smart motion detection alerts sent to your phone. Easy Wi-Fi setup with cloud storage.`;
                if (/hair.*clipper|trimmer|shaver|razor|grooming|beard/.test(nl)) return `Achieve precision grooming with the ${n}. Self-sharpening stainless steel blades, multiple length settings, powerful quiet motor, and USB-C rechargeable battery with waterproof design.`;
                if (/humidifier|diffuser|air.*purifier|fan|cooler/.test(nl)) return `Create the perfect atmosphere with the ${n}. Quiet operation, adjustable settings, and smart safety features for bedrooms, offices, and living spaces.`;
                if (/earring|necklace|bracelet|jewelry|ring|pendant|chain/.test(nl)) return `Elevate your look with the ${n}. Crafted with premium metals and stones for lasting brilliance. Hypoallergenic, tarnish-resistant finish with a gift-ready presentation box.`;
                if (/sunglasses|eyewear|glasses/.test(nl)) return `Make a statement with the ${n}. UV400 polarized lenses protect your eyes while the lightweight, durable frame ensures all-day comfort. Timeless design suits every face shape and occasion.`;
                if (/projector/.test(nl)) return `Transform any room into a cinema with the ${n}. Delivers bright, crisp visuals with full HD support, built-in speakers, and multiple connectivity options including HDMI, USB, and Wi-Fi. Portable design perfect for movie nights, presentations, and gaming.`;
                if (/power.*bank|charger|cable|adapter/.test(nl)) return `Stay powered up with the ${n}. Fast-charging technology ensures your devices are ready when you need them. Compact, portable design with intelligent safety circuitry to protect your devices from overcharging.`;
                if (/nail|press.*on|manicure|pedicure/.test(nl)) return `Get salon-quality nails at home with the ${n}. Premium designs with easy application and long-lasting wear. No salon appointment needed — achieve beautiful, Instagram-worthy nails in minutes.`;
                const words = n.split(/\s+/).filter(w => w.length > 2);
                const productType = words.slice(-Math.min(3, words.length)).join(' ') || "product";
                
                return `The ${n} is a premium ${productType.toLowerCase()} designed to elevate your everyday experience. Built with high-quality materials and thoughtful craftsmanship, it offers exceptional reliability and longevity. Its intuitive design makes it incredibly easy to use, while its robust construction ensures dependable performance for daily use across Nigeria. The ${productType.toLowerCase()} incorporates strict quality standards, providing complete satisfaction and peace of mind for buyers.

This item boasts excellent utility, delivering outstanding results and a smooth, seamless experience. It provides substantial value, allowing for consistent use without compromising on quality. Featuring a highly practical configuration, it effortlessly adapts to your needs. The carefully optimized design is tailored specifically for its category, ensuring it meets all your expectations effortlessly.

The ${n} is perfect for discerning individuals, households, and anyone looking for a high-quality, efficient solution. It’s ideal for upgrading your daily routine, enhancing productivity, and making life more convenient. Its versatile form-factor makes it highly adaptable, while its efficient design saves time and reduces effort. This product is also an excellent choice for families or businesses needing a dependable essential for daily tasks.

Inside your package, you'll find the ${n} along with standard manufacturer inclusions for immediate setup. The ${productType.toLowerCase()} represents exceptional value, offering impressive durability, everyday practicality, and a host of premium benefits at a competitive price point, making it a smart and sustainable choice for buyers on FairPrice.`;
            };
            (product as any).description = generateEnhancedDescription(product.name);
        }
    }
    const similarProducts = useMemo(() => {
        if (!product) return [];
        const isProdVehicle = isVehicle(product);
        const prodBrand = (product.specs?.Brand || product.specs?.Make || "").toLowerCase();
        const prodModel = (product.specs?.Model || product.specs?.["Model Name"] || "").toLowerCase();

        return safeAllProducts
            .filter((p) => p.category === product?.category && p.id !== product?.id)
            .sort((a, b) => {
                if (isProdVehicle) {
                    const brandA = (a.specs?.Brand || a.specs?.Make || "").toLowerCase();
                    const brandB = (b.specs?.Brand || b.specs?.Make || "").toLowerCase();
                    const modelA = (a.specs?.Model || a.specs?.["Model Name"] || "").toLowerCase();
                    const modelB = (b.specs?.Model || b.specs?.["Model Name"] || "").toLowerCase();

                    // Score matching
                    let scoreA = 0;
                    let scoreB = 0;

                    if (brandA === prodBrand) scoreA += 10;
                    if (brandB === prodBrand) scoreB += 10;
                    if (modelA === prodModel) scoreA += 5;
                    if (modelB === prodModel) scoreB += 5;

                    if (scoreA !== scoreB) return scoreB - scoreA;
                }
                return b.sold_count - a.sold_count;
            });
    }, [product, safeAllProducts]);

    const alsoBoughtProducts = useMemo(() => {
        if (!product) return [];
        return safeAllProducts
            .filter((p) => p.id !== product?.id && !similarProducts.some(s => s.id === p.id))
            .sort((a, b) => b.sold_count - a.sold_count);
    }, [product, safeAllProducts, similarProducts]);

    // Fetch Real Reviews from DataSyncService
    const realReviews = DataSyncService.getReviews(product?.id);

    // Always generate deterministic seeded reviews for UI bulk
    const pName = product?.name || "this item";
    const pCatDisplay = (product?.category) ? product.category : pName;

    const seed: number = Array.from((product as any)?.id || "default").reduce((acc: number, char: any) => acc + char.charCodeAt(0), 0);

    const allNames = ["Chukwudi Amaechi", "Aisha Bello", "Oluwaseun Adeyemi", "Tariq Ibrahim", "Ngozi Okafor", "Emeka Nwosu", "Fatima Abubakar", "Adeola Johnson", "Chinedu Okeke", "Grace Ojo", "Kemi Babalola", "Musa Danjuma", "Ifeanyi Eze", "Bola Ahmed", "Blessing Uche"];

    const titles5 = ["Omo, this thing make sense die!", "100% Legit!", "Perfect gift", "Value for money", "Too clean", "Mad o", "Exactly what I ordered", "FairPrice did not disappoint", "I highly recommend", "Very solid", "Authentic and crisp", "Worth every Naira"];
    const bodies5 = [
        `I wasn't expecting this level of quality from the ${pName}. Fits perfectly into my daily routine. Would definitely recommend to anybody looking for a solid deal in Lagos.`,
        `I was skeptical at first about buying the ${pName} online, but it came sealed and brand new. The seller was very communicative on WhatsApp.`,
        `Bought the ${pName} as a gift and they haven't stopped talking about it. Best deal I could find anywhere online.`,
        `Works perfectly and the build quality is top notch. FairPrice escrow gave me peace of mind throughout the process.`,
        `No stories, what I saw is exactly what I got. The ${pName} feels very premium. Delivery guys were also very polite.`,
        `Seriously impressed with the delivery service. For the price, you can't get anything better. Tested and trusted.`,
        `I've been using the ${pName} for a week now and it hasn't given me any headache. Solid purchase all round.`,
        `My people, if you need a reliable ${pCatDisplay} product, just buy it. You won't regret it. The quality shock me.`,
        `Omo I no go lie, this ${pName} is sharp. It's exactly as described and works flawlessly. Big ups to FairPrice.`
    ];

    const titles4 = ["Really good but delivery took a bit", "Nice product, fair price indeed", "Good, but packaging was rough", "Solid product, manageable flaws", "Does the job well", "I like it", "Good value"];
    const bodies4 = [
        `The ${pName} itself is exactly as described and works flawlessly. My only issue was the delivery to Abuja took about 5 days instead of the promised 3. Otherwise, FairPrice escrow made me feel safe.`,
        `It's a very solid ${pCatDisplay} item. Does everything the description says. Deducting one star because the packaging was slightly dented when I went to pick it up at the logistics hub.`,
        `This ${pName} is good, nice features and all. Just wish the accessories were a bit more durable. Still a good buy for the price.`,
        `Working fine so far. The product is authentic. Only giving 4 stars because the courier guy was rushing me to come out.`,
        `The ${pName} performs just as I expected. No complaints about the quality, but the seller took a whole day to ship it out.`
    ];

    const getPseudoRandom = (index: number, max: number) => {
        const scatter = Math.abs(Math.sin((seed as number) + index)) * 10000;
        return Math.floor(scatter) % max;
    };

    // Shuffle names deterministically based on seed to guarantee uniqueness
    const shuffledNames = [...allNames].sort((a, b) => {
        const ha = Math.abs(Math.sin((seed as number) + a.charCodeAt(0)));
        const hb = Math.abs(Math.sin((seed as number) + b.charCodeAt(0)));
        return ha - hb;
    });

    // Generate seeded array
    const seededReviews = [];
    const usedBodyIndices5 = new Set<number>();
    const usedBodyIndices4 = new Set<number>();
    const usedTitleIndices5 = new Set<number>();
    const usedTitleIndices4 = new Set<number>();

    for (let i = 0; i < 5; i++) {
        const isFiveStar = getPseudoRandom(i, 10) > 3; // 70% chance of 5 stars
        const rating = isFiveStar ? 5 : 4;
        // Unique name: pick from shuffled array by index (guaranteed unique for 5 reviews)
        const name = shuffledNames[i % shuffledNames.length];

        const titleList = isFiveStar ? titles5 : titles4;
        const bodyList = isFiveStar ? bodies5 : bodies4;
        const usedTitles = isFiveStar ? usedTitleIndices5 : usedTitleIndices4;
        const usedBodies = isFiveStar ? usedBodyIndices5 : usedBodyIndices4;

        // Pick unique title
        let titleIdx = getPseudoRandom(i + 20, titleList.length);
        while (usedTitles.has(titleIdx) && usedTitles.size < titleList.length) { titleIdx = (titleIdx + 1) % titleList.length; }
        usedTitles.add(titleIdx);

        // Pick unique body
        let bodyIdx = getPseudoRandom(i + 30, bodyList.length);
        while (usedBodies.has(bodyIdx) && usedBodies.size < bodyList.length) { bodyIdx = (bodyIdx + 1) % bodyList.length; }
        usedBodies.add(bodyIdx);

        seededReviews.push({
            id: `gen_r${seed}_${i}`,
            product_id: product?.id || "",
            user_id: `u${getPseudoRandom(i, 1000)}`,
            user_name: name,
            rating,
            title: titleList[titleIdx],
            body: bodyList[bodyIdx],
            verified_purchase: true,
            helpful_count: getPseudoRandom(i + 40, 50),
            images: [],
            created_at: new Date(1741700000000 - 86400000 * (getPseudoRandom(i + 50, 30) + 1)).toISOString()
        });
    }

    // Combine real reviews with AI seeded ones (real ones first)
    // Use Gemini generated AI reviews if available, otherwise fallback to local deterministic seeded ones
    const productReviews = [...realReviews, ...(aiReviews.length > 0 ? aiReviews : seededReviews)];

    const canUserReview = useMemo(() => {
        if (!user) return false;
        if (user.role === "seller" && product?.seller_id === user.id) return false;

        const orders = DataSyncService.getOrders();
        return orders.some(o =>
            (o.customer_id === user.id || o.customer_email === user.email) &&
            o.status === "delivered" &&
            o.product_id === product?.id
        );
    }, [user, product?.id, product?.seller_id]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const allImages = [product?.image_url, ...(product?.images || [])].filter((img): img is string => {
        if (!img || typeof img !== 'string') return false;
        const lower = img.toLowerCase().trim();
        if (!lower || lower === 'n/a' || lower.includes('no photo') || lower.includes('no image')) return false;
        return true;
    // image_url is set equal to images[0] at creation by several write paths (ZEMA 360
    // WhatsApp listings, global-search imports), so without this dedupe the same photo
    // always occupies both gallery slot 1 and 2, pushing every real additional photo one
    // slot later than intended.
    }).filter((img, i, arr) => arr.indexOf(img) === i)
      .map(img => getProxiedImageUrl(img));
    const deliveryDates = useMemo(() => {
        const stateName = location.includes(",") ? location.split(",")[1].trim() : location;
        const baseDays = NIGERIAN_STATES.find(s => s.state === stateName)?.delivery_days || 3;
        return getDeliveryDateRange(baseDays, baseDays + 4);
    }, [location]);
    const isGlobalProduct = product?.id?.startsWith('global-') || product?.seller_id === 'global-partners';
    const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);
    const [isPriceIntelOpen, setIsPriceIntelOpen] = useState(false);
    const vehicleDepositPctDisplay = Math.round(getVehicleDepositPercent() * 100);

    const [isFinancingDetailsOpen, setIsFinancingDetailsOpen] = useState(false);
    const [selectedTenorYears, setSelectedTenorYears] = useState<number>(0);
    const [showDurationSelector, setShowDurationSelector] = useState(false);

    // Calculate loan options if financing is enabled
    const loanAnalysis = useMemo(() => {
        if (product && hasFinancing(product)) {
            const conditionStr = (product.specs?.Condition || '').toLowerCase();
            const condition = conditionStr.includes('new') && !conditionStr.includes('used') ? 'new' : 
                             conditionStr.includes('nigerian') ? 'nigerian_used' : 'foreign_used';
            const defaultYears = selectedTenorYears > 0 ? selectedTenorYears : undefined;
            const activePrice = product.variants?.[selectedVariantIndex]?.price ? Number(product.variants[selectedVariantIndex].price) : product.price;
            const inlineProductWithQuantityPrice = { ...product, price: activePrice * quantity };
            return calculateMonthlyPayment(inlineProductWithQuantityPrice, defaultYears);
        }
        return null;
    }, [
        product?.id,
        product?.price,
        product?.category,
        product?.variants,
        selectedTenorYears,
        quantity,
        selectedVariantIndex
    ]);
    
    // Record to browsing history & Sync with DB
    useEffect(() => {
        if (product && typeof window !== 'undefined') {
            // 1. Sync fresh data from DB if possible
            DataSyncService.syncProduct(product.id);

            // 2. Add to history via consolidated service
            try {
                DataSyncService.addToHistory(product);
            } catch (e) {
                console.error("Failed to save browsing history", e);
            }
        }
    }, [product?.id]);

    // For global products, getDemoPriceComparison returns zeros. Use product price to compute market estimates.
    let priceComparison = product ? getDemoPriceComparison(product.id) : null;
    if (priceComparison && priceComparison.market_avg === 0 && product) {
        priceComparison = {
            market_low: Math.round(product.price * 0.85),
            market_high: Math.round(product.price * 1.35),
            market_avg: Math.round(product.price * 1.08),
            fp_best: product.price,
            current_price: product.price,
            flag: 'fair',
            savings: Math.round(product.price * 0.08),
        };
    }

    // Hydrate state once client-side is ready and save to browsing history
    useEffect(() => {
        setMounted(true);
        if (product) {
            // Persist global products to DataSyncService AFTER render (avoids setState-during-render)
            const isGlobal = product.id?.startsWith('global-') || product.id?.startsWith('global_') || product.seller_id === 'global-partners';
            if (isGlobal && product.price > 0) {
                const existing = DataSyncService.getProducts().find(p => p.id === product!.id);
                if (!existing) {
                    DataSyncService.addRawProduct(product as any);
                }
            }

            // Hydrate Gemini Reviews
            try {
                const cachedContent = localStorage.getItem('fp_ai_reviews');
                const allCache = cachedContent ? JSON.parse(cachedContent) : {};
                if (allCache[product.id]) {
                    setAiReviews(allCache[product.id]);
                } else {
                    // Fetch real synthetic reviews from Gemini!
                    fetch('/api/gemini-reviews', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productName: product.name, category: product.category })
                    }).then(res => res.json()).then(data => {
                        if (data.reviews && Array.isArray(data.reviews)) {
                            const mapped = data.reviews.map((r: any, i: number) => ({
                                id: `ai_${product.id}_${Date.now()}_${i}`,
                                product_id: product.id,
                                user_id: `ai_u_${Date.now()}_${i}`,
                                user_name: r.user_name || "Verified Customer",
                                rating: r.rating || 5,
                                title: r.title || "Standard item",
                                body: r.body,
                                verified_purchase: r.verified_purchase !== false,
                                helpful_count: Math.floor(Math.random() * 50),
                                created_at: r.created_at || new Date().toISOString()
                            }));
                            setAiReviews(mapped);
                            
                            const freshCache = JSON.parse(localStorage.getItem('fp_ai_reviews') || '{}');
                            freshCache[product.id] = mapped;
                            localStorage.setItem('fp_ai_reviews', JSON.stringify(freshCache));
                        }
                    }).catch(e => {
                        console.error("Failed to fetch AI reviews", e);
                    });
                }
            } catch(e) { }

        } else {
            const timer = setTimeout(() => { }, 800);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id]);

    // Hydrate Global Product Price and Image if missing or placeholder
    // Uses DUAL-STRATEGY: /api/product-image for reliable images (Serper/Google CSE),
    // and /api/gemini-price only for price/specs data. This prevents grounding URL failures.
    useEffect(() => {
        const isValidImageUrl = (url: string | undefined | null) => {
            if (!url) return false;
            const lower = url.toLowerCase();
            return !lower.includes('placeholder') &&
                   !lower.includes('vertexaisearch') &&
                   !lower.includes('grounding') &&
                   !lower.includes('no photo') &&
                   !lower.includes('no image') &&
                   !lower.includes('n/a') &&
                   !lower.includes('sample') &&
                   !lower.startsWith('data:') &&
                   lower.startsWith('http');
        };

        const hasPlaceholderImage = !isValidImageUrl(product?.image_url);
        const isGlobalProd = product?.id?.startsWith('global') || product?.seller_id === 'global-partners';
        const needsHydration = product && isGlobalProd && !isFetchingGlobalData && (product.price === 0 || hasPlaceholderImage);

        if (needsHydration && product) {
            setIsFetchingGlobalData(true);
            const namePart = product.name;
            const productId = product.id;

            // Helper: persist updates to all layers (localStorage + search cache + Postgres).
            // IMPORTANT: route through DataSyncService so we hit the CORRECT localStorage key
            // (fairprice_demo_products) and guarantee a DB row exists. The previous version
            // wrote to a phantom "fp_products" key (lost on next render) and used _imageOnly
            // which silently no-ops (P2025) when the global product row isn't in the DB yet.
            const persistUpdates = (updates: any) => {
                try {
                    const existing = DataSyncService.getProducts().find((p: any) => p.id === productId);
                    if (existing) {
                        // Writes to the correct localStorage key AND upserts the full product to Postgres
                        DataSyncService.updateProduct(productId, updates);
                    } else {
                        // Not in the catalog yet — create the row with full data incl. the new image
                        DataSyncService.addRawProduct({ ...product, ...updates } as any, true);
                    }

                    // Aggressively update the search cache so NavSearch/SRP show the new image globally
                    DataSyncService.updateSearchCacheProduct(productId, updates);

                    window.dispatchEvent(new Event("storage"));
                    setStoreVersion(v => v + 1);
                } catch (e) {
                    console.error("Failed to update global product hydration:", e);
                }
            };

            // Strategy 1: Fetch REAL images via /api/product-image (Serper/Google CSE — no grounding URLs)
            if (hasPlaceholderImage) {
                const imgQ = encodeURIComponent(namePart);
                const imgCat = encodeURIComponent(product.category || '');
                fetch(`/api/product-image?q=${imgQ}&category=${imgCat}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (!data) return;
                        const urls: string[] = data.imageUrls?.length
                            ? data.imageUrls
                            : data.imageUrl
                            ? [data.imageUrl]
                            : [];
                        if (urls.length > 0 && isValidImageUrl(urls[0])) {
                            persistUpdates({ image_url: urls[0], images: urls });
                        }
                    })
                    .catch(() => {});
            }

            // Strategy 2: Fetch price/specs via Gemini (only if price is 0)
            if (product.price === 0) {
                fetch('/api/gemini-price', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productName: namePart, mode: 'search' })
                })
                    .then(res => res.json())
                    .then(data => {
                        const bestMatch = data.suggestions?.[0];
                        if (bestMatch && bestMatch.approxPrice > 0) {
                            const updates: any = {
                                price: bestMatch.approxPrice,
                                original_price: Math.round(bestMatch.approxPrice * 1.15),
                                recommended_price: bestMatch.approxPrice,
                            };
                            if (bestMatch.specs && typeof bestMatch.specs === 'object' && Object.keys(bestMatch.specs).length > 0) {
                                updates.specs = bestMatch.specs;
                            }
                            if (bestMatch.description && bestMatch.description.length > 50) {
                                updates.description = bestMatch.description;
                            }
                            persistUpdates(updates);
                        }
                    })
                    .catch(() => {})
                    .finally(() => setIsFetchingGlobalData(false));
            } else {
                setIsFetchingGlobalData(false);
            }
        }
    }, [product?.id, product?.price, product?.image_url]);

    // Auto-open negotiation modal if ?negotiate=true is in the URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("negotiate") === "true" && product?.price_flag === "overpriced") {
            const timer = setTimeout(() => setIsNegotiationOpen(true), 100);
            return () => clearTimeout(timer);
        }

        // Auto-open review form if ?review=true is in the URL
        if (urlParams.get("review") === "true" && user) {
            setIsWritingReview(true);
            // Scroll to reviews section (optional, can be done with a ref or hash)
            setTimeout(() => {
                const reviewsSection = document.getElementById('reviews-section');
                if (reviewsSection) reviewsSection.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }, [product?.id, product?.price_flag, user]);
    const [showAllSpecs, setShowAllSpecs] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [zivaOpen, setZivaOpen] = useState(false);
    const [zivaMessages, setZivaMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
    const [zivaInput, setZivaInput] = useState("");
    const zivaRef = useRef<HTMLDivElement>(null);
    const lastTapRef = useRef<number>(0);
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showHeartBurst, setShowHeartBurst] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    
    // Lightbox & Swiping States
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [touchStartX, setTouchStartX] = useState(0);

    const zivaQA = product ? generateZivaAnswers(product) : [];

    useEffect(() => {
        if (zivaRef.current) {
            zivaRef.current.scrollTop = zivaRef.current.scrollHeight;
        }
    }, [zivaMessages]);

    const handleZivaQuestion = (question: string) => {
        const qa = zivaQA.find(q => q.question === question);
        setZivaMessages(prev => [
            ...prev,
            { role: "user", text: question },
            { role: "assistant", text: qa?.answer || `Based on the ${product?.name} specifications, I'd recommend checking the product details above or contacting the seller for this specific question.` }
        ]);
    };

    const handleZivaCustomInput = () => {
        if (!zivaInput.trim()) return;
        const input = zivaInput.trim();
        setZivaInput("");

        // Specific handling for price
        if (input.toLowerCase().includes("how much") || input.toLowerCase().includes("price") || input.toLowerCase().includes("cost")) {
            setZivaMessages(prev => [
                ...prev,
                { role: "user", text: input },
                { role: "assistant", text: `The price is ${formatPrice(product?.price || 0)}.` }
            ]);
            return;
        }

        // Specific handling for image/photo requests
        if (/\b(image|photo|picture|pic|see it|look like|what does it look)\b/i.test(input)) {
            const isGlobal = product?.id?.startsWith('global-') || product?.seller_id === 'global-partners';
            const imageAnswer = isGlobal || !product?.image_url
                ? `Great question! I'm notifying our concierge team to source high-quality images for the ${product?.name}. You'll receive an update once they're uploaded. In the meantime, the specifications table above provides detailed information about this product!`
                : `You can see the product images in the gallery above! Swipe or click the arrows to browse all available photos of the ${product?.name}.`;
            setZivaMessages(prev => [
                ...prev,
                { role: "user", text: input },
                { role: "assistant", text: imageAnswer }
            ]);
            return;
        }

        // Try to find a matching question
        const match = zivaQA.find(q => q.question.toLowerCase().includes(input.toLowerCase()) || input.toLowerCase().includes(q.question.split(" ").slice(1, 4).join(" ").toLowerCase()));
        setZivaMessages(prev => [
            ...prev,
            { role: "user", text: input },
            { role: "assistant", text: match?.answer || `Based on the ${product?.name} listing, I don't have specific information about "${input}". I recommend checking the specifications table above or reaching out to ${seller?.business_name} for more details.` }
        ]);
    };


    const getCartProduct = () => {
        if (!product) return null;
        
        const currentImageUrl = allImages[currentImageIndex] || product.image_url;
        const activeVariant = product.variants?.[selectedVariantIndex];
        
        if (!activeVariant) {
            return {
                ...product,
                image_url: currentImageUrl,
                images: allImages.length > 0 ? allImages : product.images
            };
        }
        
        return {
            ...product,
            id: `${product.id}-v${selectedVariantIndex}`,
            name: `${product.name} - ${activeVariant.name}`,
            price: activeVariant.price ? Number(activeVariant.price) : product.price,
            original_price: activeVariant.original_price ? Number(activeVariant.original_price) : product.original_price,
            image_url: activeVariant.image_url || currentImageUrl,
            images: activeVariant.image_url ? [activeVariant.image_url, ...allImages] : allImages,
        };
    };

    const handleBuyNow = () => {
        const cartProduct = getCartProduct();
        if (cartProduct) {
            for (let i = 0; i < quantity; i++) addToCart(cartProduct);
        }
        router.push("/checkout");
    };

    const handleDoubleTap = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
        // Prevent event bubbling if clicking on the image container
        e.stopPropagation();

        const now = Date.now();
        if (now - lastTapRef.current < 400) {
            // It's a double tap
            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
            if (product && !isFavorite(product.id)) {
                toggleFavorite(product.id);
            }
            setShowHeartBurst(true);
            setTimeout(() => setShowHeartBurst(false), 1000);
            lastTapRef.current = 0; // Reset
        } else {
            lastTapRef.current = now;
            tapTimeoutRef.current = setTimeout(() => {
                // If it evaluates, it's a single tap
                setIsLightboxOpen(true);
            }, 400);
        }
    }, [product, toggleFavorite, isFavorite]);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const swipeThreshold = 50;
        if (touchStartX - touchEndX > swipeThreshold) {
            // Swipe Left -> Next Image
            setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1);
        } else if (touchEndX - touchStartX > swipeThreshold) {
            // Swipe Right -> Prev Image
            setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !product) {
            alert("You must be logged in to leave a review.");
            return;
        }
        if (newReview.rating === 0) {
            alert("Please select a rating.");
            return;
        }

        setIsSubmittingReview(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        DataSyncService.addReview({
            product_id: product.id,
            user_id: user.id,
            user_name: user.name,
            rating: newReview.rating,
            title: newReview.title,
            body: newReview.body,
            verified_purchase: true, // Assuming true for demo purposes if they reach this flow
            helpful_count: 0,
            images: []
        });

        // Track review submitted
        if (typeof window !== "undefined" && (window as any).pendo) {
            (window as any).pendo.track("review_submitted", {
                product_id: product.id,
                product_name: product.name || "",
                rating: newReview.rating,
                has_title: !!newReview.title,
                has_body: !!newReview.body,
                body_length: (newReview.body || "").length,
                is_verified_purchase: true,
            });
        }

        setIsWritingReview(false);
        setNewReview({ rating: 0, title: "", body: "" });
        setIsSubmittingReview(false);

        // Remove review=true from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('review');
        window.history.replaceState({}, '', url.toString());
    };

    const keyFeatures = React.useMemo(() => {
        if (!product) return [];
        // Prioritize explicit highlights from the AI or Seller
        const features = [...(product.highlights || [])];
        if (features.length === 0 && ((product as any).shortDescription || product.description)) {
            const textToSplit = (product as any).shortDescription || product.description;
            const sentences = textToSplit.split('. ').filter((s: string) => s.length > 10).slice(0, 4);
            sentences.forEach((s: string) => features.push(s + (s.endsWith('.') ? '' : '.')));
        }
        return features;
    }, [product]);







    // Star breakdown for reviews
    const starBreakdown = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: productReviews.filter(r => r.rating === star).length,
        pct: productReviews.length > 0 ? Math.round((productReviews.filter(r => r.rating === star).length / productReviews.length) * 100) : 0
    }));

    // Compute actual rating stats from reviews
    const actualReviewCount = productReviews.length;
    let actualAvgRating = actualReviewCount > 0
        ? Math.round((productReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / actualReviewCount) * 10) / 10
        : product?.avg_rating || 0;

    if (Number.isNaN(actualAvgRating)) actualAvgRating = 0;

    const specEntries = Object.entries(product?.specs || {});
    const visibleSpecs = showAllSpecs ? specEntries : specEntries.slice(0, 6);

    // Extract helpful details from specs or description
    const ageTarget = product?.specs?.['Recommended Age'] || product?.specs?.['Age Range'] || (product?.description?.toLowerCase().includes('kids') ? 'Kids & Toddlers' : null);
    const sizeInfo = product?.specs?.['Dimensions'] || product?.specs?.['Size'] || null;
    const weightInfo = product?.specs?.['Weight'] || product?.specs?.['Item Weight'] || null;

    const isOwner = user && seller && user.id === seller.user_id;
    const isSellerApproved = seller?.status === "active" || seller?.verified === true || seller?.kyc_status === "approved" || seller?.id === "global-partners";

    const sellerYears = React.useMemo(() => {
        if (!seller?.created_at) return 1;
        const joinedDate = new Date(seller.created_at);
        const years = new Date().getFullYear() - joinedDate.getFullYear();
        return years > 0 ? years : 1;
    }, [seller]);

    // While fetching from DB, or before the client has mounted and picked up any
    // localStorage-only product/seller (a freshly seller-added product that hasn't
    // synced to the DB yet), show a spinner instead of "not found" — avoids a
    // not-found → real-content flash for that case once `mounted` flips.
    if ((!product || !seller) && (isFetchingFull || !mounted)) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="h-10 w-10 border-2 border-gray-200 border-t-brand-green-600 animate-spin rounded-full" />
                </div>
                <Footer />
            </div>
        );
    }

    if (!product || !seller) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2">Product not found</h1>
                        <p className="text-gray-500 mb-4">The product you are looking for does not exist.</p>
                        <Button asChild>
                            <Link href="/">Go Home</Link>
                        </Button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!isSellerApproved && !isOwner) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center bg-gray-50/30 backdrop-blur-3xl p-4">
                    <div className="text-center p-12 bg-white/40 rounded-[40px] border border-white/60 shadow-2xl max-w-md mx-auto">
                        <div className="h-20 w-20 bg-gray-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                            <ShieldCheck className="h-10 w-10 text-white opacity-20" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">
                            Product Restricted
                        </h1>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                            This product belongs to a storefront currently undergoing administrative verification.
                        </p>
                        <Button asChild className="mt-10 h-14 px-10 rounded-2xl bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105">
                            <Link href="/">Return to Home</Link>
                        </Button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }



    return (
        <div className="min-h-screen bg-white">
            <StructuredProductData product={product} fallbackPrice={priceComparison?.market_avg} />
            <Navbar />
            <main className="container mx-auto px-4 py-8 pt-28 pb-32 md:pb-8 font-sans">

                {/* Desktop & Mobile Breadcrumbs */}
                {showFraudWarning && (
                    <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 md:p-5 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-rose-500">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-rose-900 text-sm uppercase tracking-wider flex items-center gap-2">
                                Safety Tips <span className="bg-rose-200 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-black">IMPORTANT</span>
                            </h3>
                            <p className="text-sm text-rose-800 leading-relaxed font-medium">
                                Dear user, avoid paying a deposit before you meet the seller. Verify and inspect the car carefully before making any payment. Make payment via the platform to prevent scam & fraud.
                            </p>
                        </div>
                    </div>
                )}
                <div className="mb-6 md:mb-8">
                    <Breadcrumbs 
                        items={[
                            { label: "All Stores", href: "/stores" },
                            { label: seller.business_name || "Store", href: `/store/${seller.store_url || seller.id}` },
                            { label: product.name, active: true }
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10">
                    {/* Left Column (Images, Reviews) */}
                    <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-8 min-w-0">
                        {/* Left: Images */}
                        <div className="flex flex-col md:flex-row gap-4 lg:h-[500px]">
                            {/* Thumbnail Strip (Left Side on Desktop) */}
                            {allImages.length > 1 && (
                                <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto w-full md:w-24 flex-shrink-0 py-1 no-scrollbar order-1">
                                    {allImages.map((img, i) => (
                                        <div
                                            key={i}
                                            className={`w-16 md:w-full aspect-square flex-shrink-0 rounded-xl p-1.5 border cursor-pointer transition-all bg-white ${currentImageIndex === i ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'}`}
                                            onClick={() => setCurrentImageIndex(i)}
                                        >

                                            {isVideoUrl(img as string) ? (
                                                <div className="relative w-full h-full">
                                                    <VideoPlayer 
                                                        src={img as string} 
                                                        className="w-full h-full object-contain mix-blend-multiply" 
                                                        muted 
                                                        size="sm"
                                                    />
                                                </div>
                                            ) : (
                                                <img src={img as string} alt="" className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }} />
                                            )}

                                        </div>
                                    ))}
                                </div>
                            )}

                            <div
                                className="flex-1 bg-gray-50 rounded-2xl p-2 border border-gray-100 relative overflow-hidden group cursor-pointer select-none flex flex-col order-2"
                                onClick={handleDoubleTap}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                            >
                                <div className="flex-1 relative flex items-center justify-center aspect-square md:aspect-auto">

                                    {allImages.length > 0 ? (
                                        isVideoUrl(allImages[currentImageIndex] as string) ? (
                                            <VideoPlayer
                                                src={allImages[currentImageIndex] as string}
                                                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                                                poster={allImages.find(img => !isVideoUrl(img as string)) as string}
                                                autoPlayOnHover={true}
                                                size="lg"
                                            />
                                        ) : (
                                            <img
                                                src={allImages[currentImageIndex] as string}
                                                alt={product.name}
                                                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                                                onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }}
                                            />
                                        )

                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                            <img
                                                src="/assets/images/placeholder.png"
                                                alt="No image available"
                                                className="w-full h-full object-contain mix-blend-multiply"
                                            />
                                        </div>
                                    )}
                                    {/* Heart burst animation */}
                                    {showHeartBurst && (
                                        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                            <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-heart-burst drop-shadow-lg" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Order via WhatsApp Button Below Image */}
                                <div className="px-4 pb-4 pt-2">
                                    <Button
                                        className="w-full rounded-2xl bg-[#25D366] hover:bg-[#1da851] text-white font-black h-12 shadow-md active:scale-[0.98] transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Route to the seller's own WhatsApp when they have one on file —
                                            // previously this always went to FairPrice's admin number even for
                                            // sellers who'd already activated Ziva WhatsApp, so their orders
                                            // never reached them directly.
                                            const seller = product?.seller_id
                                                ? DataSyncService.getSellers().find((s: any) => s.id === product.seller_id)
                                                : null;
                                            const sellerHasWhatsapp = seller && (seller as any).whatsapp_enabled && (seller as any).whatsapp_number;
                                            const adminNumber = (typeof window !== 'undefined' && localStorage.getItem('fp_whatsapp_order_number')) || '2348162816305';
                                            const waNumber = sellerHasWhatsapp
                                                ? String((seller as any).whatsapp_number).replace(/[^0-9]/g, '')
                                                : adminNumber;
                                            const productUrl = typeof window !== 'undefined' ? window.location.href : '';
                                            const msg = `Hi! I'd like to order:\n\n*${product?.name || 'Product'}*\nPrice: ₦${(product?.price || 0).toLocaleString()}\n\n${productUrl}\n\nPlease confirm availability and delivery details.`;
                                            window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');

                                            // Admin (and the seller, if they weren't the recipient above) always
                                            // gets an in-app + email alert so FairPrice can follow up and make
                                            // sure the order actually gets fulfilled, even when it went straight
                                            // to the seller's own WhatsApp.
                                            fetch('/api/whatsapp/order-intent', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    product_id: product?.id,
                                                    product_name: product?.name,
                                                    product_url: productUrl,
                                                    price: product?.price,
                                                    seller_id: product?.seller_id,
                                                    routed_to_seller: !!sellerHasWhatsapp,
                                                }),
                                            }).catch(() => { /* best-effort — the WhatsApp message itself already went out */ });
                                        }}
                                    >
                                        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        Order via WhatsApp
                                    </Button>

                                    {/* Show Contact — gated behind login. Seller owner contact info is
                                        deliberately excluded from public product/seller payloads, so this
                                        calls the dedicated login-gated /contact endpoint instead. */}
                                    {!revealedContact && (
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-2xl mt-2 h-11 font-bold text-sm border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                                            disabled={contactLoading}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setContactError("");
                                                if (!user) {
                                                    router.push(`/login?returnUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`);
                                                    return;
                                                }
                                                setContactLoading(true);
                                                try {
                                                    const token = typeof window !== 'undefined' ? localStorage.getItem('fp_token') : null;
                                                    const res = await fetch(`/api/products/${product?.id}/contact`, {
                                                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                                                    });
                                                    const data = await res.json();
                                                    if (!res.ok) throw new Error(data.error || "Could not load contact info.");
                                                    setRevealedContact(data);
                                                } catch (err: any) {
                                                    setContactError(err.message || "Could not load contact info.");
                                                } finally {
                                                    setContactLoading(false);
                                                }
                                            }}
                                        >
                                            {contactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                                            Show Contact
                                        </Button>
                                    )}
                                    {contactError && (
                                        <p className="text-xs text-rose-500 font-medium mt-1.5 text-center">{contactError}</p>
                                    )}
                                    {revealedContact && (
                                        <div className="mt-2 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-1.5">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{revealedContact.business_name}</p>
                                            {revealedContact.whatsapp_number ? (
                                                <a href={`https://wa.me/${revealedContact.whatsapp_number.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-bold text-[#25D366]">
                                                    <MessageSquare className="h-4 w-4" /> {revealedContact.whatsapp_number}
                                                </a>
                                            ) : revealedContact.phone_number ? (
                                                <a href={`tel:${revealedContact.phone_number}`} className="flex items-center justify-center gap-2 text-sm font-bold text-gray-800">
                                                    <Phone className="h-4 w-4" /> {revealedContact.phone_number}
                                                </a>
                                            ) : (
                                                <p className="text-sm text-gray-500">No contact number on file — use "Order via WhatsApp" above instead.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Share With Friends */}
                        <div className="mt-2 border-t border-gray-100 pt-6 pr-4">
                            <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <Share2 className="h-4 w-4 text-emerald-600 shrink-0" /> Share With Friends
                            </h2>
                            <div className="grid grid-cols-5 gap-2 sm:gap-3 lg:grid-cols-5">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent((product?.name || '') + ' — ₦' + (product?.price || 0).toLocaleString() + ' on FairPrice: ' + (typeof window !== 'undefined' ? (window.location.href.includes('localhost') || window.location.href.includes('vercel.app') ? window.location.href : window.location.href.replace('https://www.fairprice.ng', 'https://www.fairprice.ng')) : ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-[#25D366]/20 bg-[#25D366]/5 group"
                                >
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </div>
                                </a>
                                <a
                                    href={`https://instagram.com`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-pink-500/20 bg-pink-500/5 group"
                                >
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                    </div>
                                </a>
                                <a
                                    href={`https://tiktok.com`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-gray-300 bg-gray-50 group"
                                >
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-black text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.63-1.87 5.09-4.39 6-2.5.89-5.46.46-7.55-1.12-2.06-1.55-3.08-4.22-2.58-6.72.5-2.47 2.5-4.37 4.97-4.8 2.05-.36 4.19.12 5.86 1.34v4.32c-1.07-.63-2.39-.77-3.56-.37-1.16.39-2.02 1.36-2.28 2.56-.25 1.18.15 2.45.98 3.28 1.11 1.1 3.02 1.11 4.15.15 1.25-1.05 1.66-2.73 1.66-4.32-.03-5.74-.01-11.48-.01-17.22h.01z"/></svg>
                                    </div>
                                </a>
                                <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? (window.location.href.includes('localhost') || window.location.href.includes('vercel.app') ? window.location.href : window.location.href.replace('https://www.fairprice.ng', 'https://www.fairprice.ng')) : '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-[#1877F2]/20 bg-[#1877F2]/5 group"
                                >
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                    </div>
                                </a>
                                <button
                                    onClick={async () => {
                                        const shareUrl = window.location.href.includes('localhost') || window.location.href.includes('vercel.app') ? window.location.href : window.location.href.replace('https://www.fairprice.ng', 'https://www.fairprice.ng');
                                        const success = await copyToClipboard(shareUrl);
                                        if (success) {
                                            setCopiedLink(true);
                                            setTimeout(() => setCopiedLink(false), 2000);
                                        }
                                    }}
                                    className={`flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border group ${copiedLink ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                                >
                                    <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${copiedLink ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                        {copiedLink ? (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>

                    </div>
                    {/* Center Column (Details, Specs, Seller) */}
                    <div className="md:col-span-7 lg:col-span-4 flex flex-col space-y-8 min-w-0">
                        <div className="mb-2">
                            <Link href={`/store/${seller.store_url || seller.id}`} className="text-sm font-bold text-ratel-green-600 hover:underline mb-1 inline-block">
                                {seller.business_name}
                            </Link>
                            
                            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-2">{product.name}</h1>
                            
                            {(product.category === "cars" || product.category === "vehicles" || product.category === "automotive") && isSellerApproved && (
                                <div className="mb-3 flex items-center gap-1.5 w-fit bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-blue-100 shadow-sm">
                                    <ShieldCheck className="h-3 w-3" /> {sellerYears} {sellerYears > 1 ? 'Years' : 'Year'}+ Verified Merchant
                                </div>
                            )}
                            <div className="flex items-center gap-4 text-sm mt-3">
                                <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    <Star className="h-4 w-4 fill-current" />
                                    <span>{actualAvgRating}</span>
                                </div>
                                <span className="text-gray-300">|</span>
                                <span className="text-blue-600 hover:underline cursor-pointer">{actualReviewCount.toLocaleString()} reviews</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-500">{product.sold_count} sold</span>
                            </div>
                            {sellerLocation && (
                                <div className="mt-3 flex items-center gap-1.5 text-gray-600 font-medium bg-gray-100/80 px-2.5 py-1 rounded-md inline-flex text-sm">
                                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                    <span>{sellerLocation}</span>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <p className={`text-gray-600 leading-relaxed whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-2' : ''}`}>
                                {product.description}
                            </p>
                            {product.description && product.description.length > 120 && (
                                <button
                                    onClick={() => setShowFullDescription(!showFullDescription)}
                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 mt-1 transition-colors"
                                >
                                    {showFullDescription ? 'Show Less' : 'Read Full Description'}
                                </button>
                            )}
                        </div>

                        {/* Negotiate — inline, right under the description on mobile, where it's
                            actually visible while browsing. The sticky bottom bar's icon-only
                            negotiate button (pdp-negotiate-mobile) is easy to miss/small; this is
                            a second, clearly-labeled entry point to the same negotiation modal. */}
                        {product?.stock !== 0 && (
                            <button
                                id="pdp-negotiate-inline-mobile"
                                onClick={() => setIsNegotiationOpen(true)}
                                className="md:hidden mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-full border-2 border-amber-500 text-amber-600 font-black text-sm hover:bg-amber-50 active:scale-[0.98] transition-all"
                            >
                                <Handshake className="h-4 w-4" /> Negotiate Price
                            </button>
                        )}



                        {/* Seller Info */}
                        <div className="mt-8 flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center border border-gray-200 uppercase font-black text-xl text-gray-400 overflow-hidden shrink-0">
                                {logoToUse ? (
                                    <img src={logoToUse} alt={seller.business_name} className="w-full h-full object-cover" />
                                ) : (
                                    seller.business_name[0]
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{seller.business_name}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{seller.trust_score}% Trust Score</span>
                                    {seller.verified && (
                                        <>
                                            <span>•</span>
                                            <span className="text-emerald-600 font-bold">Verified Seller</span>
                                        </>
                                    )}
                                    {seller.subscription_plan && seller.subscription_plan !== "Starter" && (
                                        <>
                                            <span>•</span>
                                            <span className="text-amber-600 font-bold flex items-center gap-1"><Crown className="h-3 w-3 fill-current" /> Premium Seller</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <Link href={`/store/${seller.store_url || seller.id}`} className="ml-auto">
                                <Button variant="outline" size="sm" className="rounded-full font-bold">View Profile</Button>
                            </Link>
                        </div>

                        {/* About This Item (Highlights & Key Specs) */}
                        {!isDeferredReady ? (
                            <div className="mb-12 bg-white rounded-2xl border border-gray-100 p-8">
                                <SectionSkeleton rows={5} />
                            </div>
                        ) : (
                            (keyFeatures.length > 0 || sizeInfo || weightInfo || ageTarget || product.subcategory || (product.colors && product.colors.length > 0)) && (
                                <div className="mb-12 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-8">
                                    <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                        <Tag className="h-5 w-5 text-ratel-green-600" />
                                        About This Item
                                    </h2>

                                    {/* Quick Spec Tags */}
                                    <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-100">
                                        {ageTarget && (
                                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
                                                <User className="h-4 w-4 text-ratel-green-600" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Target Audience</span>
                                                    <span className="text-xs font-semibold text-gray-900">{ageTarget}</span>
                                                </div>
                                            </div>
                                        )}
                                        {sizeInfo && (
                                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
                                                <MapPin className="h-4 w-4 text-blue-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Dimensions</span>
                                                    <span className="text-xs font-semibold text-gray-900">{sizeInfo}</span>
                                                </div>
                                            </div>
                                        )}
                                        {weightInfo && (
                                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
                                                <Zap className="h-4 w-4 text-amber-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Weight</span>
                                                    <span className="text-xs font-semibold text-gray-900">{weightInfo}</span>
                                                </div>
                                            </div>
                                        )}
                                        {product.subcategory && (
                                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
                                                <Tag className="h-4 w-4 text-purple-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Type</span>
                                                    <span className="text-xs font-semibold text-gray-900">{product.subcategory}</span>
                                                </div>
                                            </div>
                                        )}
                                        {product.colors && product.colors.length > 0 && (
                                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
                                                <Paintbrush className="h-4 w-4 text-pink-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Available Colors</span>
                                                    <div className="flex gap-1 mt-0.5 mt-0.5 flex-wrap">
                                                        {product.colors.filter(Boolean).map((color: any, idx: number) => (
                                            <span key={idx} className="text-[10px] font-medium bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{color}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Feature Highlights */}
                                    {keyFeatures.length > 0 && (
                                        <ul className="space-y-3">
                                            {keyFeatures.map((highlight, i) => (
                                                <li key={i} className="flex items-start gap-3 text-gray-700">
                                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-ratel-green-500 shrink-0" />
                                                    <span className="leading-relaxed text-sm">{highlight}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )
                        )}

                        {/* Product Specifications */}
                        {!isDeferredReady ? (
                             <div className="mb-12 bg-white rounded-2xl border border-gray-200 overflow-hidden p-8">
                                <SectionSkeleton rows={6} />
                             </div>
                        ) : (
                            specEntries.length > 0 && (
                                <div className="mb-12 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                                        <h2 className="text-xl font-black text-gray-900">Product Specifications</h2>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {visibleSpecs.map(([key, value], i) => (
                                            <div key={key} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                <div className="px-8 py-4 font-semibold text-gray-600 text-sm">{key}</div>
                                                <div className="px-8 py-4 col-span-2 text-gray-900 text-sm font-medium">{String(value || "")}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {specEntries.length > 6 && (
                                        <button
                                            onClick={() => setShowAllSpecs(!showAllSpecs)}
                                            className="w-full px-8 py-4 text-sm font-bold text-ratel-green-600 hover:bg-ratel-green-50 transition-colors flex items-center justify-center gap-2 border-t border-gray-100"
                                        >
                                            {showAllSpecs ? (
                                                <><ChevronUp className="h-4 w-4" /> Show Less</>
                                            ) : (
                                                <><ChevronDown className="h-4 w-4" /> Show All {specEntries.length} Specifications</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )
                        )}


                        {/* From the Seller */}
                        {!isDeferredReady ? (
                            <div className="mb-12 rounded-2xl border border-gray-100 p-8 bg-gray-50/30">
                                <SectionSkeleton rows={3} />
                            </div>
                        ) : (
                            <div className="mb-12 mt-8 rounded-2xl border border-ratel-green-100/50 p-8 backdrop-blur-xl" style={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                                <h2 className="text-xl font-black text-gray-900 mb-6">From the Seller</h2>
                                <div className="flex items-start gap-6">
                                    <Link href={`/store/${seller.store_url || seller.id}`} className="shrink-0 group">
                                        <div className="h-16 w-16 bg-gradient-to-br from-ratel-green-50 to-white rounded-full flex items-center justify-center border-2 border-ratel-green-200 uppercase font-black text-2xl text-ratel-green-600 group-hover:border-ratel-green-400 group-hover:shadow-lg transition-all cursor-pointer overflow-hidden shrink-0">
                                            {logoToUse ? (
                                                <img src={logoToUse} alt={seller.business_name} className="w-full h-full object-cover" />
                                            ) : (
                                                seller.business_name[0]
                                            )}
                                        </div>
                                    </Link>
                                    <div className="flex-1">
                                        <Link href={`/store/${seller.store_url || seller.id}`} className="hover:text-ratel-green-600 transition-colors">
                                            <h3 className="text-lg font-bold text-gray-900">{seller.business_name}</h3>
                                        </Link>
                                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{seller.description}</p>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
                                            <div className="flex items-center gap-1 text-sm">
                                                <ShieldCheck className="h-4 w-4 text-ratel-green-500" />
                                                <span className="font-semibold text-gray-700">{seller.trust_score}% Trust</span>
                                            </div>
                                            {seller.verified && (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                                    ✓ Verified Seller
                                                </Badge>
                                            )}
                                            {seller.subscription_plan && seller.subscription_plan !== "Starter" && (
                                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs flex items-center gap-1">
                                                    <Crown className="h-3 w-3 fill-current" /> Premium Seller
                                                </Badge>
                                            )}
                                            {seller.created_at && (
                                                <span className="text-xs text-gray-400">
                                                    Member since {(() => {
                                                        const d = new Date(seller.created_at);
                                                        return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                        <Link href={`/store/${seller.store_url || seller.id}`} className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-ratel-green-600 hover:text-ratel-green-700 transition-colors">
                                            Visit Store
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                    {/* Right Column (Cart side drawer placeholder) */}

                    <div className="md:col-span-12 lg:col-span-4 space-y-4 min-w-0">
                        <div className="sticky top-24 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
                            {/* Temu-style Buy Box */}
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900">Summary</h3>
                                <ShoppingCart className="h-5 w-5 text-emerald-600" />
                            </div>

                            {/* Free Shipping Progress */}
                            <div className="p-4 border-b border-gray-100 bg-emerald-50/50">
                                <div className="flex items-center gap-2 text-sm text-emerald-700 font-bold mb-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Free shipping with online payment.</span>
                                </div>
                                <p className="text-xs text-emerald-600/80 pl-6">Delivery guarantee • ₦1000 Refund for late delivery</p>
                            </div>

                            <div className="p-5 flex flex-col gap-5">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-500 font-medium">Total Price</span>
                                    {(() => {
                                        const activePrice = product.variants?.[selectedVariantIndex]?.price ? Number(product.variants[selectedVariantIndex].price) : product.price;
                                        const activeOriginalPrice = product.variants?.[selectedVariantIndex]?.original_price ? Number(product.variants[selectedVariantIndex].original_price) : (product.original_price || 0);
                                        return (
                                            <>
                                                <span className="text-3xl font-black text-emerald-500">{formatPrice(activePrice * quantity)}</span>
                                                {activeOriginalPrice > activePrice && (
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-sm text-gray-800 line-through font-medium">{formatPrice(activeOriginalPrice * quantity)}</span>
                                                        <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                            -{Math.round(((activeOriginalPrice - activePrice) / activeOriginalPrice) * 100)}% OFF
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* FairPrice Intelligence */}
                                {priceComparison && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="h-3 w-3" /> FairPrice Intelligence
                                        </p>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600">Average Market Price:</span>
                                            <span className="font-bold text-gray-900">{formatPrice(priceComparison.market_avg)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600">Verdict:</span>
                                            <span className={`font-black text-xs px-2 py-0.5 rounded-full ${product.price <= priceComparison.market_avg
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : product.price <= priceComparison.market_high
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {product.price <= priceComparison.market_avg ? 'GOOD DEAL' : product.price <= priceComparison.market_high ? 'FAIR' : 'ABOVE MARKET'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* ─── VARIANTS & BUNDLES ─── */}
                                {product.variants && product.variants.length > 0 && (
                                    <div className="mt-4 mb-2 p-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Select Option</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Base product (default — no add-on) */}
                                            <button
                                                onClick={() => {
                                                    setSelectedVariantIndex(-1);
                                                    setCurrentImageIndex(0);
                                                }}
                                                className={`flex flex-col gap-1 p-3 border rounded-xl transition-all col-span-2 text-left ${selectedVariantIndex === -1 ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-emerald-300'}`}
                                            >
                                                <span className={`text-xs font-bold line-clamp-1 ${selectedVariantIndex === -1 ? 'text-emerald-900' : 'text-gray-800'}`}>
                                                    {product.name}
                                                </span>
                                                <span className={`text-xs font-black ${selectedVariantIndex === -1 ? 'text-emerald-600' : 'text-gray-600'}`}>
                                                    {formatPrice(product.price)}
                                                </span>
                                            </button>

                                            {/* Optional add-ons / bundle variants */}
                                            {product.variants.map((v: any, idx: number) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedVariantIndex(idx);
                                                        if (v.image_url) {
                                                            const imgUrl = getProxiedImageUrl(v.image_url);
                                                            const imgIdx = allImages.findIndex(img => img === imgUrl);
                                                            if (imgIdx >= 0) {
                                                                setCurrentImageIndex(imgIdx);
                                                            } else {
                                                                setCurrentImageIndex(0);
                                                            }
                                                        }
                                                    }}
                                                    className={`flex flex-col gap-1 p-3 border rounded-xl transition-all ${selectedVariantIndex === idx ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-emerald-300'}`}
                                                >
                                                    {v.image_url && (
                                                        <img
                                                            src={getProxiedImageUrl(v.image_url)}
                                                            alt={v.name}
                                                            className="w-full h-16 object-contain rounded-lg mb-1 bg-gray-50"
                                                        />
                                                    )}
                                                    <span className={`text-xs font-bold line-clamp-2 text-left ${selectedVariantIndex === idx ? 'text-emerald-900' : 'text-gray-800'}`}>{v.name}</span>
                                                    <span className={`text-xs font-black text-left ${selectedVariantIndex === idx ? 'text-emerald-600' : 'text-gray-600'}`}>
                                                        {formatPrice(v.price ? Number(v.price) : product.price)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity Selector */}
                                <div className="mt-2 flex items-center justify-between p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50">
                                    <span className="text-sm font-bold text-emerald-800">Quantity</span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-6 text-center text-sm font-black text-emerald-900">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    {product.stock === 0 ? (
                                        <Button
                                            className="w-full rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 font-black py-6 text-lg transition-all cursor-not-allowed shadow-none"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!user) {
                                                    router.push("/login?from=" + encodeURIComponent(window.location.pathname));
                                                    return;
                                                }
                                                DataSyncService.addRestockSubscription(product.id, user.id, user.email);
                                                alert("You're on the list! We'll notify you the moment this is restocked.");
                                            }}
                                        >
                                            <AlertTriangle className="h-5 w-5 mr-2" /> Notify on Restock
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                id="pdp-buy-now"
                                                className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 text-lg transition-all hover:scale-[1.02] shadow-xl shadow-emerald-500/20"
                                                onClick={handleBuyNow}
                                            >
                                                {hasFinancing(product)
                                                    ? `Pay Full Price - ${formatPrice((product.variants?.[selectedVariantIndex]?.price ? Number(product.variants[selectedVariantIndex].price) : product.price) * quantity)}`
                                                    : `Pay ${formatPrice((product.variants?.[selectedVariantIndex]?.price ? Number(product.variants[selectedVariantIndex].price) : product.price) * quantity)}`
                                                }
                                            </Button>

                                            <Button
                                                id="pdp-add-to-cart"
                                                variant="outline"
                                                className={`w-full rounded-full font-black py-6 text-base shadow-sm transition-all duration-300 relative overflow-hidden ${addedToCart ? 'bg-black text-white hover:bg-gray-800 border-black' : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50 bg-emerald-50/50'}`}
                                                disabled={isAdding}
                                                onClick={() => {
                                                    if (addedToCart) {
                                                        router.push('/cart');
                                                    } else {
                                                        setIsAdding(true);
                                                        setTimeout(() => {
                                                            const cartProduct = getCartProduct();
                                                            if (cartProduct) {
                                                                for (let i = 0; i < quantity; i++) addToCart(cartProduct);
                                                            }
                                                            setIsAdding(false);
                                                            setAddedToCart(true);
                                                        }, 600);
                                                    }
                                                }}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center transition-transform duration-300" style={{ transform: isAdding ? 'translateY(0)' : 'translateY(100%)' }}>
                                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-emerald-600">
                                                        <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                                    </div>
                                                </div>
                                                <div className={`transition-transform duration-300 flex items-center justify-center gap-2 ${isAdding ? 'translate-y-[-100%] opacity-0' : 'translate-y-0 opacity-100'}`}>
                                                    {addedToCart ? (
                                                        <><Check className="h-5 w-5" /> View Cart</>
                                                    ) : "Add to Cart"}
                                                </div>
                                            </Button>
                                        </>
                                    )}
                                    <div className="flex flex-col items-center">
                                        <Button
                                            id="pdp-negotiate"
                                            variant="outline"
                                            className="w-full rounded-full border-amber-500 text-amber-600 hover:bg-amber-50 font-black py-6 text-base transition-all hover:scale-[1.02] shadow-sm"
                                            onClick={() => setIsNegotiationOpen(true)}
                                        >
                                            <Handshake className="h-5 w-5 mr-2" /> Negotiate Price
                                        </Button>
                                        <p className="mt-2 text-sm font-semibold text-gray-500 flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            85% Acceptance Rate
                                        </p>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 font-black py-6 text-base transition-all hover:scale-[1.02] shadow-sm flex items-center justify-center gap-3"
                                        onClick={() => setShowQrModal(true)}
                                    >
                                        <QrCode className="h-5 w-5 text-gray-400" /> 
                                        <span>Scan to Pay</span>
                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px] font-black py-0 px-1.5 border-none">FAST & SECURE</Badge>
                                    </Button>

                                    {/* Seller Contact Info */}
                                    {product.contact_info?.show && (product.contact_info?.phone || product.contact_info?.whatsapp) && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Contact Seller</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {product.contact_info.phone && (
                                                    <a href={`tel:${product.contact_info.phone}`} className="flex items-center justify-center gap-2 w-full rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 text-sm transition-colors">
                                                        <Phone className="h-4 w-4 text-gray-600" />
                                                        {product.contact_info.phone}
                                                    </a>
                                                )}
                                                {product.contact_info.whatsapp && (
                                                    <a href={`https://wa.me/${product.contact_info.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-semibold py-3 text-sm transition-colors border border-[#25D366]/20">
                                                        <MessageSquare className="h-4 w-4" />
                                                        Chat on WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Buy Now, Pay Later Discovery & Breakdown */}
                                <FinancingOffer product={product} />

                                {/* Price History Embedded Widget */}
                                {priceComparison && (
                                    <div className="mt-1">
                                        <PriceGraphWidget 
                                            history={[
                                                { month: "Sep", price: Math.round(priceComparison.market_avg * 1.05) },
                                                { month: "Oct", price: Math.round(priceComparison.market_avg * 1.01) },
                                                { month: "Nov", price: Math.round(priceComparison.market_avg * 0.98) },
                                                { month: "Dec", price: Math.round(priceComparison.market_avg * 1.08) },
                                                { month: "Jan", price: Math.round(priceComparison.market_avg * 1.02) },
                                                { month: "Feb", price: priceComparison.market_avg }
                                            ]} 
                                            priceDirection="falling" 
                                        />
                                    </div>
                                )}

                                {/* ─── GOOGLE 2026 TRUST SIGNAL: 14-DAY RETURNS ─── */}
                                <div className="mt-1 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 backdrop-blur-md flex items-center gap-4 transition-all hover:bg-emerald-50/50 group">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-emerald-200 text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                                        <RotateCcw className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-gray-900 leading-tight">14-Day Easy Returns</span>
                                        <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Consumer Protection Guaranteed</p>
                                    </div>
                                </div>



                                <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 text-[11px] text-gray-500">
                                    <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                                            <ShieldCheck className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Verified Seller Trust</p>
                                            <p className="text-sm font-bold text-emerald-900">{seller?.trust_score || 85}% Reliability Score</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 px-1">
                                        <Truck className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                                        <div className="flex flex-col">
                                            <p className="mb-1">Estimated delivery: <span className="font-bold text-gray-700">{deliveryDates.start} – {deliveryDates.end}</span></p>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] text-gray-500">Shipping to</span>
                                                <button 
                                                    onClick={() => setIsLocationModalOpen(true)}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-gray-900 hover:text-brand-green-600 transition-colors group/loc"
                                                >
                                                    <span className="cursor-pointer border-b border-dotted border-gray-400 group-hover/loc:border-brand-green-600">
                                                        {location}
                                                    </span>
                                                    <ChevronDown className="h-2.5 w-2.5 text-gray-400 group-hover/loc:text-brand-green-600" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 px-1">
                                        <ShieldCheck className="h-4 w-4 shrink-0 text-gray-400 mt-1" />
                                        <div className="relative group/escrow inline-flex">
                                            <p>Safe payments & Secure logistics. Protected by <span className="font-bold text-gray-700 underline decoration-dashed decoration-gray-300 cursor-help">FairPrice Escrow</span>.</p>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] sm:text-xs rounded-lg opacity-0 pointer-events-none group-hover/escrow:opacity-100 transition-opacity z-[9999] shadow-xl leading-snug text-center font-medium after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900">
                                                This means your funds are secure with us until you confirm delivery of the order.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommended Accessories */}
                                {similarProducts.length > 0 && (
                                    <div className="mt-5 pt-5 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                                            <Sparkles className="h-3 w-3 text-brand-orange" />
                                            Frequently Bought Together
                                        </h4>
                                        <div className="space-y-3">
                                            {similarProducts.slice(0, 3).map(accessory => (
                                                <div key={accessory.id} className="flex items-center gap-3 group relative bg-gray-50 rounded-xl p-2 border border-transparent hover:border-gray-200 hover:bg-white transition-all">
                                                    <Link href={getProductUrl(accessory)} className="shrink-0">
                                                        <div className="w-12 h-12 rounded-lg bg-white border border-gray-100 overflow-hidden relative">
                                                            <img
                                                                src={accessory.image_url || "/assets/images/placeholder-product.svg"}
                                                                onError={(e) => { e.currentTarget.src = "/assets/images/placeholder-product.svg" }}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                                alt=""
                                                            />
                                                        </div>
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <Link href={getProductUrl(accessory)} className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                                                            {accessory.name}
                                                        </Link>
                                                        <div className="text-[12px] font-black text-gray-900 mt-0.5">
                                                            {formatPrice(accessory.price)}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            addToCart(accessory);
                                                            // Optional: Toast notification here
                                                        }}
                                                        className="w-8 h-8 shrink-0 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white hover:border-black transition-colors"
                                                        aria-label="Add accessory to cart"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* View Source Button (for Global Products) - ADMIN ONLY */}
                                {product.external_url && user?.role === 'admin' && (
                                    <div className="pt-2">
                                        <Button asChild variant="outline" className="w-full rounded-xl border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 font-bold gap-2 text-xs h-9">
                                            <a href={product.external_url} target="_blank" rel="noopener noreferrer">
                                                View Product Source <ChevronRight className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                {/* Deferred Sections: Reviews & Recommendations */}
                {!isDeferredReady ? (
                    <div className="space-y-12 mt-12">
                        <SectionSkeleton height="400px" />
                        <SectionSkeleton height="300px" />
                        <SectionSkeleton height="300px" />
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Customer Reviews */}
                        {productReviews.length >= 0 && (
                            <div className="mb-12 w-full bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-border" id="reviews-section">
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">Customer Reviews</h2>
                                    {canUserReview && (
                                        <div>
                                            <Button
                                                variant="outline"
                                                className="font-bold rounded-full border-gray-300 hover:bg-gray-50 flex items-center shrink-0"
                                                onClick={() => {
                                                    if (!user) {
                                                        router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
                                                    } else {
                                                        setIsWritingReview(!isWritingReview);
                                                    }
                                                }}
                                            >
                                                {isWritingReview ? "Cancel Review" : "Write a Review"}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Leave a Review Form */}
                                {isWritingReview && user && (
                                    <div className="mb-8 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                        <h3 className="font-bold text-gray-900 mb-4">Write your review for {product.name}</h3>
                                        <form onSubmit={handleSubmitReview} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Overall Rating</label>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                                                            className="focus:outline-none"
                                                        >
                                                            <Star className={`h-8 w-8 transition-colors ${star <= newReview.rating ? "text-amber-400 fill-current" : "text-gray-300 hover:text-amber-200"}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Add a headline</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newReview.title}
                                                    onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                                                    placeholder="What's most important to know?"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Add a written review</label>
                                                <textarea
                                                    required
                                                    rows={4}
                                                    value={newReview.body}
                                                    onChange={(e) => setNewReview(prev => ({ ...prev, body: e.target.value }))}
                                                    placeholder="What did you like or dislike? What did you use this product for?"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                                                />
                                            </div>
                                            <div className="flex justify-end pt-2">
                                                <Button
                                                    type="submit"
                                                    disabled={isSubmittingReview || newReview.rating === 0 || !newReview.title || !newReview.body}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full px-8"
                                                >
                                                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div className="flex flex-col lg:flex-row gap-8 w-full">
                                    {/* Star Breakdown */}
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 lg:w-1/3 shrink-0 h-fit sticky top-24">
                                        <div className="text-center mb-4">
                                            <div className="text-5xl font-black text-gray-900">{actualAvgRating}</div>
                                            <div className="flex items-center justify-center gap-1 mt-2">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`h-5 w-5 ${s <= Math.round(actualAvgRating) ? "text-amber-400 fill-current" : "text-gray-200"}`} />
                                                ))}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{actualReviewCount.toLocaleString()} ratings</p>
                                        </div>
                                        <div className="space-y-2">
                                            {starBreakdown.map(({ star, pct }) => (
                                                <div key={star} className="flex items-center gap-3 text-sm">
                                                    <span className="w-12 text-right font-medium text-gray-600">{star} star</span>
                                                    <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="w-10 text-gray-500 text-xs">{pct}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Review List */}
                                    <div className="flex-1 space-y-4">
                                        {productReviews.length === 0 ? (
                                            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 italic text-gray-500">
                                                No reviews yet for this product. Be the first to review!
                                            </div>
                                        ) : (
                                            productReviews.slice(0, visibleReviewsCount).map(review => (
                                                <div key={review.id} className="p-5 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                                                            {(review.user_id === user?.id ? user?.name : (review.user_name || review.customer_name || 'A'))?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-sm text-gray-900">{review.user_id === user?.id ? (user?.name || 'You') : (review.user_name || review.customer_name || 'Anonymous User')}</span>
                                                            {review.verified_purchase && (
                                                                <Badge className="ml-2 bg-ratel-green-50 text-ratel-green-700 border-ratel-green-100 text-[10px]">Verified Purchase</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 mb-1">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "text-amber-400 fill-current" : "text-gray-200"}`} />
                                                        ))}
                                                        <span className="text-sm font-bold text-gray-900 ml-2">{review.title}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        {(() => {
                                                            const d = new Date(review.created_at);
                                                            return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
                                                        })()}
                                                    </p>

                                                    {/* Seller Reply Section */}
                                                    {review.seller_reply && (
                                                        <div className="mt-4 pl-4 border-l-2 border-ratel-green-200 bg-ratel-green-50/50 p-3 rounded-r-xl">
                                                            <p className="text-xs font-bold text-gray-900 mb-1">Response from {product?.seller_name || 'Seller'}</p>
                                                            <p className="text-sm text-gray-600 italic">"{review.seller_reply}"</p>
                                                        </div>
                                                    )}
                                                    {user?.id === product?.seller_id && !review.seller_reply && (
                                                        <div className="mt-3">
                                                            {replyingToReviewId === review.id ? (
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={replyText}
                                                                        onChange={(e) => setReplyText(e.target.value)}
                                                                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ratel-green-500"
                                                                        placeholder="Write a reply..."
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-ratel-green-600 hover:bg-ratel-green-700 h-auto py-1.5 text-white"
                                                                        onClick={() => {
                                                                            if (replyText.trim()) {
                                                                                review.seller_reply = replyText;
                                                                                setReplyingToReviewId(null);
                                                                                setReplyText("");
                                                                            }
                                                                        }}
                                                                    >
                                                                        Reply
                                                                    </Button>
                                                                    <Button size="sm" variant="outline" className="h-auto py-1.5" onClick={() => setReplyingToReviewId(null)}>Cancel</Button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => { setReplyingToReviewId(review.id); setReplyText(""); }}
                                                                    className="text-xs font-bold text-ratel-green-600 hover:underline flex items-center gap-1"
                                                                >
                                                                    <MessageSquare className="h-3 w-3" /> Reply as Seller
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}

                                        {visibleReviewsCount < productReviews.length && (
                                            <div className="flex justify-center mt-6">
                                                <Button
                                                    variant="outline"
                                                    className="rounded-full px-8 py-2.5 text-sm font-bold border-gray-200 hover:bg-gray-50"
                                                    onClick={() => setVisibleReviewsCount(prev => prev + 5)}
                                                >
                                                    View More Reviews <ChevronDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-12 mb-8 space-y-12">
                            <RecommendedProducts
                                products={similarProducts.length > 0 ? similarProducts : safeAllProducts.filter(p => p.id !== product?.id).slice(0, 4)}
                                title="Similar Items in this Category"
                                subtitle="Compare with related products"
                                icon={<Zap className="h-5 w-5 text-ratel-orange" />}
                            />
                            <div className="flex justify-center mt-2 flex-col items-center w-full">
                                {/* Manual pagination grid removed in favor of unified RecommendedProducts infinite scroll */}
                            </div>
                        </div>

                        {alsoBoughtProducts.length > 0 && (
                            <div className="mt-12 mb-8 space-y-12">
                                <RecommendedProducts
                                    products={alsoBoughtProducts.slice(0, visibleCABCount)}
                                    title="Customers Also Bought"
                                    subtitle="Frequently purchased together"
                                    icon={<ShoppingCart className="h-5 w-5 text-blue-500" />}
                                />

                                {/* View More CAB */}
                                {visibleCABCount < alsoBoughtProducts.length && (
                                    <div className="flex flex-col items-center gap-8 mt-6">
                                        <Button
                                            variant="outline"
                                            className="rounded-full justify-center items-center px-8 py-4 text-sm font-bold text-gray-700 hover:text-black hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm transition-all"
                                            onClick={() => setVisibleCABCount(prev => prev + 12)}
                                        >
                                            VIEW MORE <ChevronDown className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-12 mb-8 space-y-12">
                            {/* You May Also Like — more products from the same or related categories */}
                            <YouMayAlsoLike
                                cartCategories={product?.category ? [product.category] : []}
                                cartIds={new Set([product?.id].filter(Boolean) as string[])}
                                title="You May Also Like"
                            />
                        </div>
                    </motion.div>
                )}

                <NegotiationModal
                    isOpen={isNegotiationOpen}
                    onClose={() => setIsNegotiationOpen(false)}
                    product={product}
                    priceComparison={priceComparison}
                />

                <LocationModal 
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                    currentLocation={location}
                    onSelectLocation={setLocation}
                />

                {/* Spacer to prevent Footer from hiding behind fixed bars on mobile */}
                <div className="md:hidden h-28 w-full" />
            </main>

            {/* Mobile Fixed Action Bar (Forced overlay via inline styling) */}
            <div
                className="md:hidden w-full px-3 py-3 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2147483647,
                    paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 64px))',
                    transform: 'translateZ(0)',
                    willChange: 'transform'
                }}
            >
                <div className="flex gap-3 max-w-lg mx-auto">
                    {product?.stock === 0 ? (
                        <Button
                            className="flex-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 font-black h-14 shadow-none cursor-not-allowed"
                            onClick={(e) => {
                                e.preventDefault();
                                if (!user) {
                                    router.push("/login?from=" + encodeURIComponent(window.location.pathname));
                                    return;
                                }
                                DataSyncService.addRestockSubscription(product.id, user.id, user.email);
                                alert("You're on the list! We'll notify you the moment this is restocked.");
                            }}
                        >
                            <AlertTriangle className="h-5 w-5 mr-2" /> Notify on Restock
                        </Button>
                    ) : (
                        <>
                            <Button
                                id="pdp-negotiate-mobile"
                                variant="outline"
                                className="shrink-0 w-14 h-14 rounded-full border-amber-500 text-amber-600 hover:bg-amber-50 shadow-sm active:scale-95 transition-transform p-0"
                                onClick={() => setIsNegotiationOpen(true)}
                                aria-label="Negotiate Price"
                            >
                                <Handshake className="h-5 w-5" />
                            </Button>
                            <Button
                                id="pdp-mobile-buy-now"
                                className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 shadow-lg active:scale-95 transition-transform"
                                onClick={handleBuyNow}
                            >
                                Buy Now
                            </Button>
                            <Button
                                id="pdp-mobile-add-to-cart"
                                className="flex-1 rounded-full bg-gray-900 hover:bg-black text-white font-black h-14 shadow-lg active:scale-95 transition-transform"
                                onClick={() => {
                                    setIsAdding(true);
                                    setTimeout(() => {
                                        for (let i = 0; i < quantity; i++) addToCart(product!);
                                        setIsAdding(false);
                                        setAddedToCart(true);
                                    }, 500);
                                }}
                            >
                                {isAdding ? "Adding..." : addedToCart ? "Added!" : "Add to Cart"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="pb-[120px] md:pb-0 relative z-[1]">
                <Footer />
            </div>

            {/* Lightbox Modal */}
            {isLightboxOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10001] bg-black/85 backdrop-blur-3xl flex flex-col items-center justify-center p-0"
                >
                    {/* Background Overlay - Tap to close */}
                    <div className="absolute inset-0 bg-black/20 cursor-pointer" onClick={() => setIsLightboxOpen(false)} />

                    {/* Close Button - Enhanced visibility */}
                    <button 
                        className="absolute top-6 right-6 md:top-8 md:right-8 z-[10005] w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 backdrop-blur-md"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        <X className="h-6 w-6" />
                    </button>

                    {/* Desktop Thumbnails - Left Aligned */}
                    {allImages.length > 1 && (
                        <div className="hidden lg:flex flex-col gap-4 absolute left-8 top-1/2 -translate-y-1/2 z-[10005]">
                            {allImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                    className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all p-0.5 bg-black/20 ${
                                        currentImageIndex === idx ? "border-emerald-500 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "border-white/10 opacity-40 hover:opacity-100"
                                    }`}
                                >

                                     {isVideoUrl(img as string) ? (
                                         <div className="relative w-full h-full">
                                             <VideoPlayer 
                                                src={img as string} 
                                                className="w-full h-full object-cover rounded-xl" 
                                                muted 
                                                size="sm"
                                             />
                                         </div>
                                     ) : (
                                         <img src={img as string} alt="" className="w-full h-full object-cover rounded-xl" />
                                     )}

                                </button>
                            ))}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full h-full px-0 lg:px-24">
                        {/* Image Display */}
                        <div 
                            className="relative w-full lg:flex-1 h-[50vh] lg:h-[80vh] flex items-center justify-center z-[10004]"
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentImageIndex}
                                    initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 1.05, x: -20 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="w-full h-full flex items-center justify-center"
                                >

                                    {isVideoUrl(allImages[currentImageIndex] as string) ? (
                                        <VideoPlayer
                                            src={allImages[currentImageIndex] as string}
                                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-black/50 select-none"
                                            autoPlayOnHover={false}
                                            size="lg"
                                        />
                                    ) : (
                                        <img 
                                            src={allImages[currentImageIndex] as string} 
                                            alt={product.name} 
                                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-black/50 select-none" 
                                        />
                                    )}

                                </motion.div>
                            </AnimatePresence>
                            
                            {/* Mobile Indicators */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 lg:hidden">
                                {allImages.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all ${currentImageIndex === i ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/30'}`} />
                                ))}
                            </div>
                        </div>

                        {/* Sidebar: Product Info & Buy Now */}
                        <div className="hidden lg:flex flex-col gap-6 z-[10005] w-96 animate-in slide-in-from-right-8 duration-500">
                            <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                                <h3 className="text-white font-bold text-2xl mb-2 leading-tight tracking-tight">{product.name}</h3>
                                <p className="text-emerald-400 font-black text-4xl mb-8 tracking-tighter">₦{product.price.toLocaleString()}</p>
                                
                                <div className="space-y-5 mb-10">
                                    <div className="flex items-center gap-4 text-white/70">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">FairPrice Protected</p>
                                            <p className="text-[11px] text-white/40 leading-none">Safe payment & guarantee</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-white/70">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Authenticity Verified</p>
                                            <p className="text-[11px] text-white/40 leading-none">Quality check passed</p>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    className="w-full py-9 rounded-3xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-[0_20px_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex flex-col gap-0 uppercase tracking-tighter"
                                    onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); handleBuyNow(); }}
                                >
                                    <span className="text-2xl">Buy Now</span>
                                    <span className="text-[11px] opacity-70 font-bold tracking-normal normal-case mt-1">Secure Checkout</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Arrows — small, faintly-transparent overlay on mobile so they
                        never compete with the image itself for space; full-size solid treatment
                        preserved on desktop where there's room to spare. */}
                    {allImages.length > 1 && (
                        <>
                            <button
                                className="absolute left-1.5 lg:left-32 top-1/2 -translate-y-1/2 z-[10006] w-9 h-9 lg:w-14 lg:h-14 flex items-center justify-center rounded-full bg-black/20 lg:bg-black/40 hover:bg-black/50 lg:hover:bg-black/60 text-white transition-all border border-white/10 backdrop-blur-sm lg:backdrop-blur-md group"
                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1); }}
                            >
                                <ChevronLeft className="h-5 w-5 lg:h-8 lg:w-8 group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                            <button
                                className="absolute right-1.5 lg:right-32 top-1/2 -translate-y-1/2 z-[10006] w-9 h-9 lg:w-14 lg:h-14 flex items-center justify-center rounded-full bg-black/20 lg:bg-black/40 hover:bg-black/50 lg:hover:bg-black/60 text-white transition-all border border-white/10 backdrop-blur-sm lg:backdrop-blur-md group"
                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1); }}
                            >
                                <ChevronRight className="h-5 w-5 lg:h-8 lg:w-8 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </>
                    )}
                </motion.div>
            )}
            <PriceIntelModal 
                isOpen={isPriceIntelOpen} 
                onClose={() => setIsPriceIntelOpen(false)} 
                initialQuery={product?.name || ""}
            />
            <FinancingDetailsModal
                isOpen={isFinancingModalOpen}
                onClose={() => setIsFinancingModalOpen(false)}
                product={product}
            />

            {/* QR Payment Modal */}
            <AnimatePresence>
                {showQrModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setShowQrModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative z-[201] w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white rounded-[40px] shadow-2xl p-6 md:p-8 text-center border border-gray-100 scrollbar-hide"
                        >
                            <button 
                                onClick={() => setShowQrModal(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                            
                            <div className="mx-auto w-12 h-12 md:w-16 md:h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 md:mb-6 shadow-inner">
                                <QrCode className="h-6 w-6 md:h-8 md:w-8 text-emerald-600" />
                            </div>
                            
                            <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-2">Scan to Pay</h2>
                            <p className="text-gray-500 mb-4 md:mb-8 text-xs md:text-sm font-medium leading-tight">
                                Fast, secure, and touchless payment. <br/> 
                                Scan with your phone camera.
                            </p>

                            <div className="bg-gray-50 p-4 md:p-6 rounded-[32px] border-4 border-white shadow-inner mb-6 flex flex-col items-center">
                                <div className="relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <QRCodeCanvas 
                                        id="product-payment-qr"
                                        value={typeof window !== 'undefined' ? (() => {
                                            const safeImage = product?.image_url && !product.image_url.startsWith('data:') ? product.image_url : '';
                                            const params = new URLSearchParams({ productId: product?.id || '', amount: String(product?.price || 0), name: product?.name || '', category: product?.category || '' });
                                            if (safeImage) params.set('image', safeImage);
                                            return `${window.location.origin}/checkout/direct?${params.toString()}`;
                                        })() : ''}
                                        size={180}
                                        level="H"
                                        imageSettings={{
                                            src: logoToUse || "/logo.png",
                                            x: undefined,
                                            y: undefined,
                                            height: 40,
                                            width: 40,
                                            excavate: true,
                                        }}
                                        fgColor="#000000"
                                        className="mx-auto"
                                    />
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">Or pay directly on this device:</p>
                                    <div className="flex flex-row items-center justify-center gap-3">
                                        <button 
                                            onClick={() => {
                                                setShowQrModal(false);
                                                handleBuyNow();
                                            }}
                                            className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-200 transition-colors shrink-0"
                                        >
                                            Tap to Checkout
                                        </button>
                                        <div className="flex items-center justify-center gap-1.5 opacity-80 shrink-0">
                                            {/* Mastercard SVG */}
                                            <svg className="w-6 h-4" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="12" r="12" fill="#EB001B"/>
                                                <circle cx="24" cy="12" r="12" fill="#F79E1B"/>
                                                <path d="M18 20.4853C20.6698 18.6702 22.5 15.5422 22.5 12C22.5 8.45778 20.6698 5.32982 18 3.51472C15.3302 5.32982 13.5 8.45778 13.5 12C13.5 15.5422 15.3302 18.6702 18 20.4853Z" fill="#FF5F00"/>
                                            </svg>
                                            {/* Visa SVG */}
                                            <svg className="w-8 h-4 rounded-sm bg-blue-800 flex items-center justify-center px-1" viewBox="0 0 36 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14.6548 0.625366L9.61334 11.3752H6.26257L3.95544 3.12565C3.81848 2.50285 3.65588 2.2155 3.19702 1.95679C2.42255 1.51737 1.15112 1.0504 0 0.825226V0.625366H5.21045C5.86792 0.625366 6.45288 1.04543 6.61157 1.83186L7.91528 8.63229L11.3533 0.625366H14.6548ZM26.3779 7.64716C26.3989 4.79374 22.464 4.6346 22.4854 3.32832C22.4922 2.92345 22.8804 2.49352 23.7549 2.37895C24.1956 2.3168 25.4377 2.27453 26.4302 2.73463L27.0176 0.111816C26.4819 0.00976562 25.5459 0 24.4379 0C21.4324 0 19.4175 1.54719 19.3958 3.75087C19.3765 5.37839 20.9163 6.28822 22.072 6.83763C23.2644 7.40445 23.6655 7.765 23.6624 8.27211C23.6565 9.04753 22.6953 9.39558 21.8491 9.39558C20.3013 9.39558 19.4121 8.98036 18.7842 8.68205L18.1729 11.3653C18.7905 11.6462 20.071 11.875 21.4019 11.875C24.5886 11.875 26.3572 10.3343 26.3779 7.64716ZM34.2144 11.3752H37.0503L34.1866 0.625366H31.5496C30.9824 0.625366 30.5093 0.94101 30.292 1.45564L25.8601 11.3752H29.3093L29.9978 9.53535H34.2144V11.3752ZM30.9839 6.80531L32.656 2.36894L33.623 6.80531H30.9839ZM18.4233 11.3752L15.4243 0.625366H12.3552L15.3523 11.3752H18.4233Z" fill="white"/>
                                            </svg>
                                            {/* OPay Stylized Text */}
                                            <div className="h-4 px-1.5 flex items-center justify-center bg-emerald-500 rounded-sm">
                                                <span className="text-[10px] font-black text-white italic tracking-tighter">OPay</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest">
                                    <ShieldCheck className="h-4 w-4" /> Secure Paystack Gateway
                                </div>
                                <Button
                                    onClick={() => setShowQrModal(false)}
                                    className="w-full h-12 md:h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold text-base md:text-lg"
                                >
                                    Done
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper icon component
function CheckCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
