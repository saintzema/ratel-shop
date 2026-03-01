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

    useEffect(() => {
        setMounted(true);
    }, []);

    // Use DemoStore for live product data (includes seller-added products)
    const allProducts = DemoStore.getProducts();
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
            // Last resort: create a minimal placeholder from the URL slug
            const name = namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            product = {
                id: decodedId,
                name,
                price: 0,
                original_price: 0,
                category: "electronics",
                description: `${name} - sourced globally via FairPrice AI exclusively for you. Protect your purchase with our Escrow service.`,
                image_url: "",
                images: [],
                seller_id: 'global-partners',
                seller_name: 'Global Stores',
                price_flag: 'fair',
                sold_count: 50,
                review_count: 12,
                avg_rating: 4.8,
                is_active: true,
                created_at: new Date().toISOString(),
                recommended_price: 0,
                specs: {
                    "Sourcing": "Global Network",
                    "Shipping": "Air Freight (Tracked)",
                    "Warranty": "1 Year International",
                    "Condition": "Brand New"
                },
            } as any;
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
            business_name: product.seller_name || "FairPrice Marketplace",
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
        const pCat = product?.category || "product";

        productReviews = [
            { id: "r1", product_id: product?.id || "", user_id: "u1", user_name: "Chukwudi Amaechi", rating: 5, title: "Omo, this thing make sense die!", body: `I wasn't expecting this level of quality from the ${pName}. Fits perfectly into my daily routine. Would definitely recommend to anybody looking for a solid ${pCat} deal in Lagos.`, verified_purchase: true, helpful_count: 12, images: [], created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: "r2", product_id: product?.id || "", user_id: "u2", user_name: "Aisha Bello", rating: 4, title: "Really good but delivery took a bit", body: `The ${pCat} itself is exactly as described and works flawlessly. My only issue was the delivery to Abuja took about 5 days instead of the promised 3. Otherwise, FairPrice escrow made me feel safe buying ${pName}.`, verified_purchase: true, helpful_count: 5, images: [], created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
            { id: "r3", product_id: product?.id || "", user_id: "u3", user_name: "Oluwaseun Adeyemi", rating: 5, title: "100% Legit!", body: `I was skeptical at first about buying ${pName} online in NG, but it came sealed and brand new. The seller was very communicative on WhatsApp.`, verified_purchase: true, helpful_count: 24, images: [], created_at: new Date(Date.now() - 86400000 * 12).toISOString() },
            { id: "r4", product_id: product?.id || "", user_id: "u4", user_name: "Tariq Ibrahim", rating: 4, title: "Nice product, fair price indeed", body: `It's a very solid ${pCat}. Does everything the specs say. Deducting one star because the packaging for ${pName} was slightly dented when I went to pick it up at the logistics hub.`, verified_purchase: true, helpful_count: 2, images: [], created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
            { id: "r5", product_id: product?.id || "", user_id: "u5", user_name: "Ngozi Okafor", rating: 5, title: "Perfect gift for my husband", body: `Bought ${pName} for my husband's birthday and he hasn't stopped talking about it. ${pCat === 'electronics' || pCat === 'phones' ? 'The battery life is surprisingly good.' : 'The quality is great.'} Best price I could find online across Jumia and Konga.`, verified_purchase: true, helpful_count: 8, images: [], created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
        ];
    }
    const canUserReview = useMemo(() => {
        if (!user) return false;
        if (user.role === "seller" && product?.seller_id === user.id) return false;

        const orders = DemoStore.getOrders();
        return orders.some(o =>
            o.customer_id === user.id &&
            o.status === "delivered" &&
            o.product_id === product?.id
        );
    }, [user, product?.id, product?.seller_id]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const allImages = [product?.image_url, ...(product?.images || [])].filter(Boolean);
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

            // Save to Browsing History
            try {
                const historyStr = localStorage.getItem('fp_browsing_history');
                let history = historyStr ? JSON.parse(historyStr) : [];
                // Remove if already exists to put it at the top
                history = history.filter((p: any) => p.id !== product.id);
                // Add to start
                history.unshift(product);
                // Keep only last 50 items
                if (history.length > 50) history = history.slice(0, 50);
                localStorage.setItem('fp_browsing_history', JSON.stringify(history));
            } catch (e) {
                console.error("Failed to save browsing history", e);
            }
        } else {
            // Optional: simulate a slight network delay before showing 404
            const timer = setTimeout(() => {
                // Not doing anything here now
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [product]);

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

    const specEntries = Object.entries(product?.specs || {});
    const visibleSpecs = showAllSpecs ? specEntries : specEntries.slice(0, 6);

    // Extract helpful details from specs or description
    const ageTarget = product?.specs?.['Recommended Age'] || product?.specs?.['Age Range'] || (product?.description?.toLowerCase().includes('kids') ? 'Kids & Toddlers' : null);
    const sizeInfo = product?.specs?.['Dimensions'] || product?.specs?.['Size'] || null;
    const weightInfo = product?.specs?.['Weight'] || product?.specs?.['Item Weight'] || null;

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

    if (!mounted) return null; // Prevent hydration error from DemoStore local storage

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
                    <div className="lg:col-span-4 flex flex-col gap-8">
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
                                            <img src={img as string} alt="" className="w-full h-full object-contain mix-blend-multiply" />
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

                    </div>
                    {/* Center Column (Details, Specs, Seller) */}
                    <div className="lg:col-span-5 flex flex-col space-y-8">
                        <div className="mb-2">
                            <Link href={`/store/${seller.id}`} className="text-sm font-bold text-ratel-green-600 hover:underline mb-1 inline-block">
                                {seller.business_name}
                            </Link>
                            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-2">{product.name}</h1>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    <Star className="h-4 w-4 fill-current" />
                                    <span>{product.avg_rating}</span>
                                </div>
                                <span className="text-gray-300">|</span>
                                <span className="text-blue-600 hover:underline cursor-pointer">{Number(product.review_count).toLocaleString()} reviews</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-500">{product.sold_count} sold</span>
                            </div>
                        </div>

                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {product.description}
                        </p>
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
                            <Link href={`/store/${seller.id}`} className="ml-auto">
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
                                <Link href={`/store/${seller.id}`} className="shrink-0 group">
                                    <div className="h-16 w-16 bg-gradient-to-br from-ratel-green-50 to-white rounded-full flex items-center justify-center border-2 border-ratel-green-200 uppercase font-black text-2xl text-ratel-green-600 group-hover:border-ratel-green-400 group-hover:shadow-lg transition-all cursor-pointer">
                                        {seller.business_name[0]}
                                    </div>
                                </Link>
                                <div className="flex-1">
                                    <Link href={`/store/${seller.id}`} className="hover:text-ratel-green-600 transition-colors">
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
                                    <Link href={`/store/${seller.id}`} className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-ratel-green-600 hover:text-ratel-green-700 transition-colors">
                                        Visit Store
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                    </div>
                    {/* Right Column (Cart side drawer placeholder) */}

                    <div className="lg:col-span-3 space-y-4">
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
                                    <span className="text-3xl font-black text-emerald-500">{formatPrice(product.price * quantity)}</span>
                                    {product.original_price && (
                                        <span className="text-sm text-gray-800 line-through font-medium">{formatPrice(product.original_price * quantity)}</span>
                                    )}
                                </div>

                                {/* FairPrice Intelligence */}
                                {priceComparison && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="h-3 w-3" /> FairPrice Intelligence
                                        </p>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600">Average Price on other stores:</span>
                                            <span className="font-bold text-gray-900">{formatPrice(priceComparison.market_avg)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600">Verdict:</span>
                                            <span className={`font-black text-xs px-2 py-0.5 rounded-full ${product.price <= priceComparison.market_avg
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : product.price <= priceComparison.market_high
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-red-100 text-red-700'
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

                    {/* Share With Friends */}
                    <div className="mb-12 mt-6">
                        <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2 px-1">
                            <Share2 className="h-5 w-5 text-emerald-600" /> Share With Friends
                        </h2>
                        <div className="grid grid-cols-4 md:grid-cols-2 gap-2 sm:gap-3">
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(product.name + ' — ₦' + product.price.toLocaleString() + ' on FairPrice: ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg border border-[#25D366]/20 bg-[#25D366]/5 group"
                            >
                                <div className="h-10 w-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </div>
                                <span className="text-[11px] sm:text-[13px] font-bold text-[#25D366]">WhatsApp</span>
                            </a>
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out ' + product.name + ' on FairPrice!')}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg border border-gray-300 bg-gray-50 group"
                            >
                                <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                </div>
                                <span className="text-[11px] sm:text-[13px] font-bold text-gray-900">X</span>
                            </a>
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg border border-[#1877F2]/20 bg-[#1877F2]/5 group"
                            >
                                <div className="h-10 w-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                </div>
                                <span className="text-[11px] sm:text-[13px] font-bold text-[#1877F2]">Facebook</span>
                            </a>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    setCopiedLink(true);
                                    setTimeout(() => setCopiedLink(false), 2000);
                                }}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg border group ${copiedLink ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                            >
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${copiedLink ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                    {copiedLink ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                                    )}
                                </div>
                                <span className={`text-[11px] sm:text-[13px] font-bold ${copiedLink ? 'text-emerald-700' : 'text-gray-700'}`}>
                                    {copiedLink ? 'Copied!' : 'Copy Link'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Customer Reviews */}
                {productReviews.length >= 0 && (
                    <div className="mb-12" id="reviews-section">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-gray-900">Customer Reviews</h2>
                            {canUserReview && (
                                <Button
                                    variant="outline"
                                    className="font-bold rounded-full border-gray-300 hover:bg-gray-50"
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

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Star Breakdown */}
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="text-center mb-4">
                                    <div className="text-5xl font-black text-gray-900">{product.avg_rating}</div>
                                    <div className="flex items-center justify-center gap-1 mt-2">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} className={`h-5 w-5 ${s <= Math.round(product.avg_rating) ? "text-amber-400 fill-current" : "text-gray-200"}`} />
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{product.review_count.toLocaleString()} ratings</p>
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
                            <div className="lg:col-span-2 space-y-4">
                                {productReviews.length === 0 ? (
                                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 italic text-gray-500">
                                        No reviews yet for this product. Be the first to review!
                                    </div>
                                ) : (
                                    productReviews.slice(0, visibleReviewsCount).map(review => (
                                        <div key={review.id} className="p-5 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                                                    {review.user_name[0]}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sm text-gray-900">{review.user_name}</span>
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
                        {visibleProductsCount > 8 && (() => {
                            const youMayLike = allProducts
                                .filter(p => p.id !== product?.id && !similarProducts.includes(p) && !alsoBoughtProducts.includes(p))
                                .sort(() => Math.random() - 0.5)
                                .slice(0, visibleProductsCount - 8);
                            if (youMayLike.length === 0) return null;
                            return (
                                <RecommendedProducts
                                    products={youMayLike}
                                    title="You May Also Like"
                                    subtitle="Curated picks based on this product"
                                />
                            );
                        })()}
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


