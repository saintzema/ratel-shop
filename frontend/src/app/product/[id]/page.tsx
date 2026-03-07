"use client";

import { useParams, useRouter } from "next/navigation";
import { DEMO_PRODUCTS, DEMO_SELLERS, DEMO_REVIEWS, DEMO_DEALS, getDemoPriceComparison } from "@/lib/data";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { SearchGridCard } from "@/components/product/SearchGridCard";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { RecommendedProducts } from "@/components/ui/RecommendedProducts";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { NegotiationModal } from "@/components/modals/NegotiationModal";
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
    Minus
} from "lucide-react";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";

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
function generateZivaAnswers(product: typeof DEMO_PRODUCTS[0]): { question: string; answer: string }[] {
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


export default function ProductDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const { location } = useLocation();
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const { user } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [loadedMore, setLoadedMore] = useState(false);

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

    const [isFetchingGlobalData, setIsFetchingGlobalData] = useState(false);
    const [storeVersion, setStoreVersion] = useState(0);

    useEffect(() => {
        setMounted(true);
        const handleStorageChange = () => setStoreVersion(v => v + 1);
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // Use DemoStore for live product data (includes seller-added products)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const allProducts = DemoStore.getProducts(); // re-reads on storeVersion change
    const allSellers = DemoStore.getSellers();

    // Decode URI-encoded IDs (e.g. "AirPods%20Pro%203" → "AirPods Pro 3")
    const decodedId = id ? decodeURIComponent(id) : id;
    let product = allProducts.find((p) => p.id === decodedId) || allProducts.find((p) => p.id === id) || DEMO_PRODUCTS.find((p) => p.id === decodedId) || DEMO_PRODUCTS.find((p) => p.id === id) || DEMO_DEALS.map(d => d.product).find((p) => p.id === decodedId || p.id === id);

    // Auto-hydrate global product from URL if missing from store cache
    if (!product && (decodedId?.startsWith('global_') || decodedId?.startsWith('global-'))) {
        // id format: "global-airpods-pro-2" or legacy "global_samsung_galaxy_s24_ultra"
        const namePart = decodedId.replace(/^global[-_]/, '').replace(/[-_]/g, ' ');
        const nameTokens = namePart.toLowerCase().split(' ').filter(Boolean);

        // Try to find a matching product already stored in DemoStore by name similarity
        const allStored = DemoStore.getProducts();
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
                // Enhanced generic fallback with product-aware details
                return `Discover the ${n} — a carefully curated product selected for exceptional quality and outstanding value. Built with premium materials and meticulous attention to detail, each unit undergoes rigorous quality inspection to ensure reliability and long-lasting performance.\n\nKey Highlights:\n• Premium build quality with durable, high-grade materials\n• Thoughtful design focused on ease of use and practical everyday functionality\n• Thorough quality testing and inspection before dispatch\n• Comprehensive packaging to ensure safe delivery\n\nYour purchase is protected by FairPrice's buyer protection guarantee and secure escrow payment system, so you can shop with complete confidence. Fast, tracked delivery with real-time updates keeps you informed every step of the way.`;
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
                return { "Brand": n.split(' ')[0], "Condition": "Brand New — Factory Sealed", "Warranty": "1 Year Manufacturer Warranty", "Shipping": "Express Delivery (2-5 Business Days)", "Returns": "30-Day Return Policy", "Payment": "Secure Escrow Protection" };
            };

            // Check search cache for this product (has real price from global search)
            const cachedProducts = DemoStore.getAllCachedProducts();
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
                if (typeof window !== 'undefined') {
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
                    } as any;
                } else {
                    // Last resort: create a rich placeholder from the URL slug
                    const name = namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                    // Generate a deterministic realistic price based on the name string
                    const seed = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    // Price between 5,000 and 150,000 rounded to nearest 500
                    const generatedPrice = 5000 + (seed % 290) * 500;

                    product = {
                        id: decodedId,
                        name,
                        price: generatedPrice,
                        original_price: Math.floor(generatedPrice * 1.5),
                        category: "electronics",
                        description: generateDescription(name),
                        image_url: "",
                        images: [],
                        seller_id: 'global-partners',
                        seller_name: 'Global Stores',
                        price_flag: 'fair',
                        sold_count: 50 + (seed % 500),
                        review_count: 12 + (seed % 100),
                        avg_rating: 4.5 + ((seed % 5) / 10),
                        is_active: true,
                        created_at: new Date().toISOString(),
                        recommended_price: generatedPrice,
                        specs: generateSpecs(name),
                    } as any;

                    // Persist deferred to useEffect below
                }
            }
        }
    }

    let seller = allSellers.find((s) => s.id === product?.seller_id) || DEMO_SELLERS.find((s) => s.id === product?.seller_id);

    // Fallback for global sourcing products if global-partners isn't in older localStorage DemoStore caches
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
                return `Discover the ${n} — carefully selected for exceptional quality and outstanding value. Built with premium materials and meticulous attention to detail. Every unit undergoes rigorous quality inspection to ensure reliability and long-lasting performance. Protected by FairPrice buyer guarantee and secure escrow payment.`;
            };
            (product as any).description = generateEnhancedDescription(product.name);
        }
    }
    // Define 'Customers Also Bought' exactly like search results (popular products across entire catalog, excluding self)
    const alsoBoughtProducts = allProducts
        .filter((p) => p.id !== product?.id)
        .sort((a, b) => b.sold_count - a.sold_count);
    const similarProducts = allProducts
        .filter((p) => p.category === product?.category && p.id !== product?.id)
        .sort((a, b) => b.sold_count - a.sold_count)
        .slice(0, 15);

    // Fetch Reviews from DemoStore
    let productReviews = DemoStore.getReviews(product?.id);
    if (productReviews.length === 0) {
        const pName = product?.name || "this item";
        // Use a display-friendly category for review body text
        const pCatDisplay = (product?.category) ? product.category : pName;

        const seed = Array.from(product?.id || "default").reduce((acc, char) => acc + char.charCodeAt(0), 0);

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
            const scatter = Math.abs(Math.sin(seed + index)) * 10000;
            return Math.floor(scatter) % max;
        };

        // Shuffle names deterministically based on seed to guarantee uniqueness
        const shuffledNames = [...allNames].sort((a, b) => {
            const ha = Math.abs(Math.sin(seed + a.charCodeAt(0)));
            const hb = Math.abs(Math.sin(seed + b.charCodeAt(0)));
            return ha - hb;
        });

        productReviews = [];
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

            productReviews.push({
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
                created_at: new Date(Date.now() - 86400000 * (getPseudoRandom(i + 50, 30) + 1)).toISOString()
            });
        }
    }
    const canUserReview = useMemo(() => {
        if (!user) return false;
        if (user.role === "seller" && product?.seller_id === user.id) return false;

        const orders = DemoStore.getOrders();
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
    });
    const deliveryDates = useMemo(() => getDeliveryDateRange(3, 7), []);
    const isGlobalProduct = product?.id?.startsWith('global-') || product?.seller_id === 'global-partners';
    const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);

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
            // Persist global products to DemoStore AFTER render (avoids setState-during-render)
            const isGlobal = product.id?.startsWith('global-') || product.id?.startsWith('global_') || product.seller_id === 'global-partners';
            if (isGlobal) {
                const existing = DemoStore.getProducts().find(p => p.id === product.id);
                if (!existing) {
                    DemoStore.addRawProduct(product as any);
                }
            }

            // Save to Browsing History
            try {
                DemoStore.addToHistory(product);
            } catch (e) {
                console.error("Failed to save browsing history", e);
            }
        } else {
            const timer = setTimeout(() => { }, 800);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id]);

    // Hydrate Global Product Price if missing
    useEffect(() => {
        if (product && product.price === 0 && product.id?.startsWith('global') && !isFetchingGlobalData) {
            setIsFetchingGlobalData(true);
            const namePart = product.name;
            const productId = product.id;
            fetch('/api/gemini-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: namePart, mode: 'search' })
            })
                .then(res => res.json())
                .then(data => {
                    const bestMatch = data.suggestions?.[0];
                    if (bestMatch && bestMatch.approxPrice) {
                        const validImageUrl = bestMatch.image_url && !bestMatch.image_url.toLowerCase().includes('no photo') && !bestMatch.image_url.toLowerCase().includes('n/a') ? bestMatch.image_url : null;
                        // Update existing product in DemoStore (addRawProduct skips if ID exists)
                        try {
                            const products = DemoStore.getProducts();
                            const idx = products.findIndex((p: any) => p.id === productId);
                            if (idx >= 0) {
                                products[idx] = {
                                    ...products[idx],
                                    price: bestMatch.approxPrice,
                                    original_price: Math.round(bestMatch.approxPrice * 1.15),
                                    recommended_price: bestMatch.approxPrice,
                                    specs: bestMatch.specs || products[idx].specs,
                                    ...(validImageUrl ? { image_url: validImageUrl } : {}),
                                };
                                localStorage.setItem('fp_products', JSON.stringify(products));
                            } else {
                                const updatedProduct = {
                                    ...product,
                                    price: bestMatch.approxPrice,
                                    original_price: Math.round(bestMatch.approxPrice * 1.15),
                                    recommended_price: bestMatch.approxPrice,
                                    specs: bestMatch.specs || product.specs,
                                    ...(validImageUrl ? { image_url: validImageUrl } : {}),
                                };
                                DemoStore.addRawProduct(updatedProduct as any);
                            }
                            window.dispatchEvent(new Event("storage"));
                            setStoreVersion(v => v + 1);
                        } catch (e) {
                            console.error("Failed to update global product price:", e);
                        }
                    }
                })
                .catch(() => { })
                .finally(() => setIsFetchingGlobalData(false));
        }
    }, [product?.id, product?.price]);

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
    const [showHeartBurst, setShowHeartBurst] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

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


    const handleBuyNow = () => {
        if (product) {
            for (let i = 0; i < quantity; i++) addToCart(product);
        }
        router.push("/checkout");
    };

    const handleDoubleTap = React.useCallback((e: React.MouseEvent) => {
        // Prevent event bubbling if clicking on the image container
        e.stopPropagation();

        const now = Date.now();
        if (now - lastTapRef.current < 400) {
            // It's a double tap
            if (product && !isFavorite(product.id)) {
                toggleFavorite(product.id);
            }
            setShowHeartBurst(true);
            setTimeout(() => setShowHeartBurst(false), 1000);
            lastTapRef.current = 0; // Reset
        } else {
            lastTapRef.current = now;
        }
    }, [product, toggleFavorite, isFavorite]);

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

        DemoStore.addReview({
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
        const features = [...(product.highlights || [])];
        if (features.length === 0 && product.description) {
            const sentences = product.description.split('. ').filter(s => s.length > 10).slice(0, 4);
            sentences.forEach(s => features.push(s + (s.endsWith('.') ? '' : '.')));
        }
        return features;
    }, [product]);







    // Star breakdown for reviews
    const starBreakdown = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: productReviews.filter(r => r.rating === star).length,
        pct: productReviews.length > 0 ? Math.round((productReviews.filter(r => r.rating === star).length / productReviews.length) * 100) : 0
    }));

    // Compute actual rating stats from reviews (don't rely on product.avg_rating which may be 0 for global products)
    const actualReviewCount = productReviews.length;
    const actualAvgRating = actualReviewCount > 0
        ? Math.round((productReviews.reduce((sum, r) => sum + r.rating, 0) / actualReviewCount) * 10) / 10
        : product?.avg_rating || 0;

    const specEntries = Object.entries(product?.specs || {});
    const visibleSpecs = showAllSpecs ? specEntries : specEntries.slice(0, 6);

    // Extract helpful details from specs or description
    const ageTarget = product?.specs?.['Recommended Age'] || product?.specs?.['Age Range'] || (product?.description?.toLowerCase().includes('kids') ? 'Kids & Toddlers' : null);
    const sizeInfo = product?.specs?.['Dimensions'] || product?.specs?.['Size'] || null;
    const weightInfo = product?.specs?.['Weight'] || product?.specs?.['Item Weight'] || null;

    const isOwner = user && seller && user.id === seller.user_id;
    const isSellerApproved = seller?.status === "active" || seller?.verified === true || seller?.kyc_status === "approved" || seller?.id === "global-partners";

    // Wait for client-side hydration before rendering
    if (!mounted) return null;

    // Dynamic features list
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
            <Navbar />
            <main className="container mx-auto px-4 py-8 pt-24 pb-32 md:pb-8 font-sans">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
                    <Link href="/" className="hover:text-black">Home</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href={`/category/${product.category}`} className="hover:text-black capitalize">{product.category}</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-black truncate max-w-[200px]">{product.name}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-16">
                    {/* Left Column (Images, Reviews) */}
                    <div className="lg:col-span-4 flex flex-col gap-8 min-w-0">
                        {/* Left: Images */}
                        <div className="flex flex-col md:flex-row gap-4 lg:h-[500px]">
                            {/* Thumbnail Strip */}
                            {allImages.length > 1 && (
                                <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto w-full md:w-20 flex-shrink-0 py-1 no-scrollbar order-2 md:order-1">
                                    {allImages.map((img, i) => (
                                        <div
                                            key={i}
                                            className={`w-16 md:w-full aspect-square flex-shrink-0 rounded-xl p-1.5 border cursor-pointer transition-all bg-white ${currentImageIndex === i ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'}`}
                                            onClick={() => setCurrentImageIndex(i)}
                                        >
                                            <img src={img as string} alt="" className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Main Image View */}
                            <div
                                className="flex-1 bg-gray-50 rounded-2xl p-2 border border-gray-100 relative overflow-hidden group cursor-pointer select-none flex items-center justify-center order-1 md:order-2 aspect-square md:aspect-auto"
                                onClick={handleDoubleTap}
                            >
                                {allImages.length > 0 ? (
                                    <img
                                        src={allImages[currentImageIndex] as string}
                                        alt={product.name}
                                        className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                                        onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }}
                                    />
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

                                {/* Navigation Arrows */}
                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1); }}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center shadow-sm md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-110 z-20"
                                        >
                                            <ChevronLeft className="h-5 w-5 text-gray-700" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1); }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full flex items-center justify-center shadow-sm md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-110 z-20"
                                        >
                                            <ChevronRight className="h-5 w-5 text-gray-700" />
                                        </button>
                                    </>
                                )}

                                {/* Indicators */}
                                {allImages.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                                        {allImages.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all ${currentImageIndex === i ? 'w-4 bg-emerald-500' : 'w-1.5 bg-gray-300'}`} />
                                        ))}
                                    </div>
                                )}

                                {product.price_flag !== 'none' && (
                                    <div className="absolute top-4 left-4 z-10">
                                        {product.price_flag === 'fair' ? (
                                            <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/70 backdrop-blur-md rounded-full border border-emerald-500/20 shadow-xl">
                                                <ShieldCheck className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                                                <span className="text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest">Fair Price</span>
                                            </div>
                                        ) : product.price_flag === 'overpriced' ? (
                                            <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/70 backdrop-blur-md rounded-full border border-red-500/20 shadow-xl">
                                                <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500" />
                                                <span className="text-[10px] md:text-xs font-black text-red-500 uppercase tracking-widest">Pricing Alert</span>
                                            </div>
                                        ) : product.price_flag === 'great_deal' ? (
                                            <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/70 backdrop-blur-md rounded-full border border-emerald-400/30 shadow-xl">
                                                <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-500" />
                                                <span className="text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest">Great Deal</span>
                                            </div>
                                        ) : product.price_flag === 'too_low' ? (
                                            <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/70 backdrop-blur-md rounded-full border border-yellow-400/30 shadow-xl">
                                                <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500" />
                                                <span className="text-[10px] md:text-xs font-black text-amber-600 uppercase tracking-widest">Low Price</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/70 backdrop-blur-md rounded-full border border-gray-300/30 shadow-xl">
                                                <Info className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
                                                <span className="text-[10px] md:text-xs font-black text-gray-600 uppercase tracking-widest">{product.price_flag}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (product) toggleFavorite(product.id); }}
                                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors z-20"
                                >
                                    <Heart className={`h-5 w-5 transition-colors ${product && isFavorite(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Share With Friends */}
                        <div className="mt-2 border-t border-gray-100 pt-6 pr-4">
                            <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <Share2 className="h-4 w-4 text-emerald-600 shrink-0" /> Share With Friends
                            </h2>
                            <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-4">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent((product?.name || '') + ' — ₦' + (product?.price || 0).toLocaleString() + ' on FairPrice: ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-[#25D366]/20 bg-[#25D366]/5 group"
                                >
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </div>
                                </a>
                                <a
                                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out ' + (product?.name || '') + ' on FairPrice!')}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-gray-300 bg-gray-50 group"
                                >
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-black text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                    </div>
                                </a>
                                <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-[#1877F2]/20 bg-[#1877F2]/5 group"
                                >
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                    </div>
                                </a>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        setCopiedLink(true);
                                        setTimeout(() => setCopiedLink(false), 2000);
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
                    <div className="lg:col-span-5 flex flex-col space-y-8 min-w-0">
                        <div className="mb-2">
                            <Link href={`/store/${seller.store_url || seller.id}`} className="text-sm font-bold text-ratel-green-600 hover:underline mb-1 inline-block">
                                {seller.business_name}
                            </Link>
                            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-2">{product.name}</h1>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    <Star className="h-4 w-4 fill-current" />
                                    <span>{actualAvgRating}</span>
                                </div>
                                <span className="text-gray-300">|</span>
                                <span className="text-blue-600 hover:underline cursor-pointer">{actualReviewCount.toLocaleString()} reviews</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-500">{product.sold_count} sold</span>
                            </div>
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
                        {product.specs && Object.keys(product.specs).length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-emerald-500" />
                                    Product Specifications
                                </h3>
                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {(showAllSpecs ? Object.entries(product.specs) : Object.entries(product.specs).slice(0, 6)).map(([key, value], i) => (
                                                <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                                    <td className="px-4 py-2.5 font-bold text-gray-700 w-[40%] border-r border-gray-100 whitespace-nowrap">{key}</td>
                                                    <td className="px-4 py-2.5 text-gray-600">{value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {Object.keys(product.specs).length > 6 && (
                                        <button
                                            onClick={() => setShowAllSpecs(!showAllSpecs)}
                                            className="w-full py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-gray-200 flex items-center justify-center gap-1"
                                        >
                                            {showAllSpecs ? (
                                                <><ChevronUp className="h-3.5 w-3.5" /> Show Less</>
                                            ) : (
                                                <><ChevronDown className="h-3.5 w-3.5" /> Show All {Object.keys(product.specs).length} Specifications</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}



                        {/* Seller Info */}
                        <div className="mt-8 flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center border border-gray-200 uppercase font-black text-xl text-gray-400">
                                {seller.business_name[0]}
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
                                            <span className="text-amber-600 font-bold">Premium Seller</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <Link href={`/store/${seller.store_url || seller.id}`} className="ml-auto">
                                <Button variant="outline" size="sm" className="rounded-full font-bold">View Profile</Button>
                            </Link>
                        </div>

                        {/* About This Item (Highlights & Key Specs) */}
                        {(keyFeatures.length > 0 || sizeInfo || weightInfo || ageTarget || product.subcategory || (product.colors && product.colors.length > 0)) && (
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
                                                    {product.colors.filter(Boolean).map((color, idx) => (
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
                        )}

                        {/* Product Specifications */}
                        {specEntries.length > 0 && (
                            <div className="mb-12 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                                    <h2 className="text-xl font-black text-gray-900">Product Specifications</h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {visibleSpecs.map(([key, value], i) => (
                                        <div key={key} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                            <div className="px-8 py-4 font-semibold text-gray-600 text-sm">{key}</div>
                                            <div className="px-8 py-4 col-span-2 text-gray-900 text-sm font-medium">{value}</div>
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
                        )}


                        {/* From the Seller */}
                        <div className="mb-12 mt-8 rounded-2xl border border-ratel-green-100/50 p-8 backdrop-blur-xl" style={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                            <h2 className="text-xl font-black text-gray-900 mb-6">From the Seller</h2>
                            <div className="flex items-start gap-6">
                                <Link href={`/store/${seller.store_url || seller.id}`} className="shrink-0 group">
                                    <div className="h-16 w-16 bg-gradient-to-br from-ratel-green-50 to-white rounded-full flex items-center justify-center border-2 border-ratel-green-200 uppercase font-black text-2xl text-ratel-green-600 group-hover:border-ratel-green-400 group-hover:shadow-lg transition-all cursor-pointer">
                                        {seller.business_name[0]}
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
                                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                                ★ Premium Seller
                                            </Badge>
                                        )}
                                        {seller.created_at && (
                                            <span className="text-xs text-gray-400">Member since {new Date(seller.created_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}</span>
                                        )}
                                    </div>
                                    <Link href={`/store/${seller.store_url || seller.id}`} className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-ratel-green-600 hover:text-ratel-green-700 transition-colors">
                                        Visit Store
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                    </div>
                    {/* Right Column (Cart side drawer placeholder) */}

                    <div className="lg:col-span-3 space-y-4 min-w-0">
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
                                    <>
                                        <span className="text-3xl font-black text-emerald-500">{formatPrice(product.price * quantity)}</span>
                                        {(product.original_price || 0) > product.price && (
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-sm text-gray-800 line-through font-medium">{formatPrice((product.original_price || 0) * quantity)}</span>
                                                <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                    -{Math.round(((product.original_price! - product.price) / product.original_price!) * 100)}% OFF
                                                </span>
                                            </div>
                                        )}
                                    </>
                                </div>

                                {/* FairPrice Intelligence */}
                                {priceComparison && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="h-3 w-3" /> FairPrice Intelligence
                                        </p>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600">Average Price:</span>
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

                                {/* Quantity Selector */}
                                <div className="flex items-center justify-between p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50">
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


                                    <Button
                                        className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 text-lg transition-all hover:scale-[1.02]"
                                        onClick={() => {
                                            for (let i = 0; i < quantity; i++) addToCart(product);
                                            router.push('/checkout');
                                        }}
                                    >
                                        Buy Now
                                    </Button>


                                    <Button
                                        variant="outline"
                                        className={`w-full rounded-full font-black py-6 text-base shadow-sm transition-all duration-300 relative overflow-hidden ${addedToCart ? 'bg-black text-white hover:bg-gray-800 border-black' : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50 bg-emerald-50/50'}`}
                                        disabled={isAdding}
                                        onClick={() => {
                                            if (addedToCart) {
                                                router.push('/cart');
                                            } else {
                                                setIsAdding(true);
                                                setTimeout(() => {
                                                    for (let i = 0; i < quantity; i++) addToCart(product);
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
                                            ) : "Add to cart"}
                                        </div>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-full border-amber-500 text-amber-600 hover:bg-amber-50 font-black py-6 text-base transition-all hover:scale-[1.02] shadow-sm"
                                        onClick={() => setIsNegotiationOpen(true)}
                                    >
                                        <Handshake className="h-5 w-5 mr-2" /> Negotiate Price
                                    </Button>

                                </div>

                                <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 text-[11px] text-gray-500">
                                    <div className="flex items-start gap-2">
                                        <Truck className="h-4 w-4 shrink-0 text-gray-400" />
                                        <p>Estimated delivery: <span className="font-bold text-gray-700">{deliveryDates.start} – {deliveryDates.end}</span> to <span className="font-bold text-emerald-600 underline decoration-dashed cursor-pointer hover:text-emerald-700">{location}</span></p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <ShieldCheck className="h-4 w-4 shrink-0 text-gray-400" />
                                        <p>Safe payments & Secure logistics. Protected by <span className="font-bold text-gray-700">FairPrice Escrow</span>.</p>
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
                                                    <Link href={`/product/${accessory.id}`} className="shrink-0">
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
                                                        <Link href={`/product/${accessory.id}`} className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
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
                                                    {(review.user_id === user?.id ? user?.name : review.user_name)?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sm text-gray-900">{review.user_id === user?.id ? user?.name : review.user_name}</span>
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
                                            <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>

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

                {/* Similar Products */}
                {similarProducts.length > 0 && (
                    <div className="mt-12 mb-8 space-y-12">
                        <RecommendedProducts
                            products={similarProducts}
                            title="Similar Items in this Category"
                            subtitle="Compare with related products"
                            icon={<Zap className="h-5 w-5 text-ratel-orange" />}
                        />
                        <div className="flex justify-center mt-2 flex-col items-center w-full">
                            {loadedMore && (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full mt-4 mb-4">
                                    {Array.from({ length: visibleProductsCount }).map((_, i) => {
                                        // Filter extra products excluding similar products to prevent adjacent duplicates
                                        const extraProducts = allProducts.filter(p => p.id !== product?.id && !similarProducts.some(s => s.id === p.id));

                                        // If extraProducts is empty, fallback to similar products, or just allProducts
                                        const sourceProducts = extraProducts.length > 0 ? extraProducts : allProducts;

                                        const item = sourceProducts[i % sourceProducts.length];
                                        return (
                                            <div key={`${item.id}-${i}`} className="h-full">
                                                <SearchGridCard product={item} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <Button
                                variant="outline"
                                className="rounded-full justify-center items-center px-8 py-4 text-sm font-bold text-gray-700 hover:text-black hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm transition-all"
                                onClick={() => {
                                    if (!loadedMore) {
                                        setLoadedMore(true);
                                    } else {
                                        setVisibleProductsCount(prev => prev + 8);
                                    }
                                }}
                            >
                                VIEW MORE <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </div>

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

                        {/* You May Also Like — more products from the same or related categories */}
                        <YouMayAlsoLike
                            cartCategories={product?.category ? [product.category] : []}
                            cartIds={new Set([product?.id].filter(Boolean) as string[])}
                            title="You May Also Like"
                        />
                    </div>
                )}

                <NegotiationModal
                    isOpen={isNegotiationOpen}
                    onClose={() => setIsNegotiationOpen(false)}
                    product={product}
                    priceComparison={priceComparison}
                />

                {/* Mobile Fixed Action Bar */}
                <div className="md:hidden fixed bottom-16 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] z-40 pb-safe">
                    <div className="flex gap-3">
                        <Button
                            className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md"
                            onClick={handleBuyNow}
                        >
                            Buy Now
                        </Button>
                        <Button
                            className="flex-1 rounded-full bg-black hover:bg-gray-800 text-white font-bold h-12"
                            onClick={() => { for (let i = 0; i < quantity; i++) addToCart(product); }}
                        >
                            Add to Cart
                        </Button>
                    </div>
                </div>
            </main>
            <Footer />
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


