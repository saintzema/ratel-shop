"use client";

import { useParams, useRouter } from "next/navigation";
import { DEMO_PRODUCTS, DEMO_SELLERS, DEMO_REVIEWS, getDemoPriceComparison } from "@/lib/data";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { NegotiationModal } from "@/components/modals/NegotiationModal";
import {
    Handshake,
    MessageSquare,
    Tag,
    ShoppingCart,
    Heart,
    Share2,
    ChevronRight,
    ShieldCheck,
    Truck,
    RotateCcw,
    Star,
    MapPin,
    Info,
    Gavel,
    AlertTriangle,
    Lock,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Send,
    Bot,
    User,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

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

    // Always add a shipping question
    qa.push({ question: "How fast is delivery?", answer: "Most orders are delivered within 2-5 business days. Free delivery is available to major cities across Nigeria." });

    return qa.slice(0, 6);
}


export default function ProductDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const { location } = useLocation();
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const router = useRouter();

    // Use DemoStore for live product data (includes seller-added products)
    const allProducts = DemoStore.getProducts();
    const allSellers = DemoStore.getSellers();

    const product = allProducts.find((p) => p.id === id) || DEMO_PRODUCTS.find((p) => p.id === id);
    const seller = allSellers.find((s) => s.id === product?.seller_id) || DEMO_SELLERS.find((s) => s.id === product?.seller_id);
    const similarProducts = allProducts.filter((p) => p.category === product?.category && p.id !== product?.id).slice(0, 4);
    const productReviews = DEMO_REVIEWS.filter((r) => r.product_id === product?.id);

    const priceComparison = product ? getDemoPriceComparison(product.id) : null;
    const isGoodDeal = priceComparison ? priceComparison.current_price <= priceComparison.market_avg : false;

    const [mainImage, setMainImage] = useState(product?.image_url);
    const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);

    // Auto-open negotiation modal if ?negotiate=true is in the URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("negotiate") === "true" && product?.price_flag === "overpriced") {
            setIsNegotiationOpen(true);
        }
    }, [product]);
    const [showAllSpecs, setShowAllSpecs] = useState(false);
    const [zivaOpen, setZivaOpen] = useState(false);
    const [zivaMessages, setZivaMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
    const [zivaInput, setZivaInput] = useState("");
    const zivaRef = useRef<HTMLDivElement>(null);
    const lastTapRef = useRef<number>(0);
    const [showHeartBurst, setShowHeartBurst] = useState(false);

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

        // Try to find a matching question
        const match = zivaQA.find(q => q.question.toLowerCase().includes(input.toLowerCase()) || input.toLowerCase().includes(q.question.split(" ").slice(1, 4).join(" ").toLowerCase()));
        setZivaMessages(prev => [
            ...prev,
            { role: "user", text: input },
            { role: "assistant", text: match?.answer || `Based on the ${product?.name} listing, I don't have specific information about "${input}". I recommend checking the specifications table above or reaching out to ${seller?.business_name} for more details.` }
        ]);
    };


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

    const handleBuyNow = () => {
        if (product) addToCart(product);
        router.push("/checkout");
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            if (product && !isFavorite(product.id)) {
                toggleFavorite(product.id);
            }
            setShowHeartBurst(true);
            setTimeout(() => setShowHeartBurst(false), 900);
        }
        lastTapRef.current = now;
    };

    // Star breakdown for reviews
    const starBreakdown = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: productReviews.filter(r => r.rating === star).length,
        pct: productReviews.length > 0 ? Math.round((productReviews.filter(r => r.rating === star).length / productReviews.length) * 100) : 0
    }));

    const specEntries = Object.entries(product.specs || {});
    const visibleSpecs = showAllSpecs ? specEntries : specEntries.slice(0, 6);

    return (
        <div className="min-h-screen bg-white">
            <Navbar />


            <main className="container mx-auto px-4 py-8 pt-24 font-sans">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
                    <Link href="/" className="hover:text-black">Home</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href={`/category/${product.category}`} className="hover:text-black capitalize">{product.category}</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-black truncate max-w-[200px]">{product.name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                    {/* Left: Images */}
                    <div className="space-y-4">
                        <div
                            className="bg-gray-50 rounded-2xl p-8 border border-gray-100 aspect-square flex items-center justify-center relative overflow-hidden group cursor-pointer select-none"
                            onClick={handleDoubleTap}
                        >
                            <img
                                src={mainImage || product.image_url}
                                alt={product.name}
                                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                            />
                            {/* Heart burst animation */}
                            {showHeartBurst && (
                                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                    <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-heart-burst drop-shadow-lg" />
                                </div>
                            )}
                            {product.price_flag !== 'none' && (
                                <div className="absolute top-4 left-4">
                                    {product.price_flag === 'fair' ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-md rounded-full border border-emerald-500/20 shadow-xl">
                                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Fair Price</span>
                                        </div>
                                    ) : product.price_flag === 'overpriced' ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-md rounded-full border border-red-500/20 shadow-xl">
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                            <span className="text-xs font-black text-red-500 uppercase tracking-widest">Pricing Alert</span>
                                        </div>
                                    ) : (
                                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                                            {product.price_flag}
                                        </Badge>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); if (product) toggleFavorite(product.id); }}
                                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors z-10"
                            >
                                <Heart className={`h-5 w-5 transition-colors ${product && isFavorite(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'}`} />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {[product.image_url, ...product.images].slice(0, 4).map((img, i) => (
                                <div
                                    key={i}
                                    className={`bg-gray-50 rounded-xl p-2 border aspect-square cursor-pointer transition-all ${mainImage === img ? 'border-ratel-green-600 ring-1 ring-ratel-green-600' : 'border-gray-100 hover:border-gray-300'
                                        }`}
                                    onClick={() => setMainImage(img)}
                                >
                                    <img src={img} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Product Details */}
                    <div>
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
                                <span className="text-blue-600 hover:underline cursor-pointer">{formatPrice(Number(product.review_count))} reviews</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-500">{product.sold_count} sold</span>
                            </div>
                        </div>

                        <div className="border-t border-b border-gray-100 py-6 my-6 space-y-4">
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-black tracking-tight">{formatPrice(product.price)}</span>
                                {product.original_price && (
                                    <span className="text-lg text-gray-400 line-through mb-1">{formatPrice(product.original_price)}</span>
                                )}
                            </div>

                            {priceComparison && (
                                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 border border-blue-100">
                                    <div className="flex items-center gap-2 font-bold mb-1">
                                        <Info className="h-4 w-4" />
                                        <span>Ratel Price Intelligence</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Market Average:</span>
                                        <span className="font-bold">{formatPrice(priceComparison.market_avg)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span>Verdict:</span>
                                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                                            ${product.price_flag === 'fair' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                product.price_flag === 'overpriced' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                    'bg-yellow-50 text-yellow-700 border border-yellow-100'}
                                        `}>
                                            {product.price_flag === 'fair' ? 'Good Deal' :
                                                product.price_flag === 'overpriced' ? 'Overpriced' : 'Suspiciously Low'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="text-gray-600 leading-relaxed">
                                {product.description}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4 bg-white p-6 border border-gray-200 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <Truck className="h-4 w-4" />
                                <span>Free delivery to <span className="font-bold text-black border-b border-dashed border-gray-300 cursor-pointer">{location}</span> by <span className="font-bold text-ratel-green-600">Wed, Feb 14</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-600 mb-4 font-medium">
                                <CheckCircle className="h-4 w-4" />
                                <span>In Stock ({product.stock} units left)</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    className="w-full rounded-full bg-ratel-orange hover:bg-amber-500 text-black font-bold h-12 text-lg shadow-ratel-glow transition-all hover:scale-[1.02] cursor-pointer"
                                    onClick={handleBuyNow}
                                >
                                    Buy Now
                                </Button>
                                <Button
                                    className="w-full rounded-full bg-black hover:bg-gray-800 text-white font-bold h-12 text-lg cursor-pointer"
                                    onClick={() => addToCart(product)}
                                >
                                    Add to Cart
                                </Button>
                            </div>

                            {/* Negotiation Button (Only if overpriced or suspicious) */}
                            {(product.price_flag === 'overpriced' || product.price_flag === 'suspicious') && (
                                <div className="space-y-2 pt-2 border-t border-dashed border-zinc-200">
                                    <Button
                                        onClick={() => setIsNegotiationOpen(true)}
                                        variant="outline"
                                        className="w-full rounded-full border-zinc-200 hover:border-ratel-green-600 hover:bg-ratel-green-50 text-zinc-700 font-bold gap-2"
                                    >
                                        <Handshake className="h-4 w-4" /> Negotiate Price
                                    </Button>
                                    <p className="text-[10px] text-zinc-500 text-center px-2">
                                        Protected by <span className="font-bold text-black">Escrow</span>. Payment only released after delivery confirms quality.
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-6 pt-4 text-sm font-bold text-gray-500">
                                <button className="flex items-center gap-2 hover:text-black transition-colors"><ShieldCheck className="h-4 w-4" /> Secure Transaction</button>
                                <button className="flex items-center gap-2 hover:text-black transition-colors"><RotateCcw className="h-4 w-4" /> 7-Day Returns</button>
                            </div>
                        </div>

                        {/* Seller Info */}
                        <div className="mt-8 flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center border border-gray-200 uppercase font-black text-xl text-gray-400">
                                {seller.business_name[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{seller.business_name}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{seller.trust_score}% Trust Score</span>
                                    <span>•</span>
                                    <span>{seller.verified ? 'Verified Seller' : 'Unverified'}</span>
                                </div>
                            </div>
                            <Link href={`/store/${seller.id}`} className="ml-auto">
                                <Button variant="outline" size="sm" className="rounded-full font-bold">View Profile</Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ─── ENHANCED SECTIONS ─────────────────────────────── */}

                {/* About This Item (Highlights) */}
                {product.highlights && product.highlights.length > 0 && (
                    <div className="mb-12 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-8">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <Tag className="h-5 w-5 text-ratel-green-600" />
                            About This Item
                        </h2>
                        <ul className="space-y-3">
                            {product.highlights.map((highlight, i) => (
                                <li key={i} className="flex items-start gap-3 text-gray-700">
                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-ratel-green-500 shrink-0" />
                                    <span className="leading-relaxed">{highlight}</span>
                                </li>
                            ))}
                        </ul>
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

                {/* Ask Ziva AI Assistant */}
                <div className="mb-12">
                    <div
                        className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 rounded-2xl border border-purple-100 overflow-hidden cursor-pointer"
                        onClick={() => setZivaOpen(!zivaOpen)}
                    >
                        <div className="px-8 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-200">
                                    <Sparkles className="h-5 w-5 text-gray-900" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">Ask Ziva</h2>
                                    <p className="text-xs text-gray-500">AI-powered product assistant</p>
                                </div>
                            </div>
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold">
                                {zivaOpen ? "Close" : "Ask a question"}
                            </Badge>
                        </div>
                    </div>

                    {zivaOpen && (
                        <div className="border border-t-0 border-purple-100 rounded-b-2xl bg-white overflow-hidden">
                            {/* Suggested Questions */}
                            <div className="p-6 border-b border-gray-100">
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Suggested Questions</p>
                                <div className="flex flex-wrap gap-2">
                                    {zivaQA.map((qa, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleZivaQuestion(qa.question)}
                                            className="text-xs px-3 py-2 rounded-full bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 transition-colors font-medium"
                                        >
                                            {qa.question}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chat Messages */}
                            {zivaMessages.length > 0 && (
                                <div ref={zivaRef} className="max-h-[300px] overflow-y-auto p-6 space-y-4">
                                    {zivaMessages.map((msg, i) => (
                                        <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                            {msg.role === "assistant" && (
                                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                                                    <Bot className="h-3.5 w-3.5 text-gray-900" />
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${msg.role === "user"
                                                ? "bg-black text-white rounded-br-sm"
                                                : "bg-purple-50 text-gray-800 rounded-bl-sm border border-purple-100"
                                                }`}>
                                                {msg.text}
                                            </div>
                                            {msg.role === "user" && (
                                                <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                                    <User className="h-3.5 w-3.5 text-gray-600" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Custom input */}
                            <div className="p-4 border-t border-gray-100 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask Ziva about this product..."
                                    value={zivaInput}
                                    onChange={(e) => setZivaInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleZivaCustomInput()}
                                    className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
                                />
                                <Button
                                    onClick={handleZivaCustomInput}
                                    size="sm"
                                    className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-gray-900 h-10 w-10 p-0"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Customer Reviews */}
                {productReviews.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-xl font-black text-gray-900 mb-6">Customer Reviews</h2>
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
                                {productReviews.map(review => (
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
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* From the Seller */}
                <div className="mb-12 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-8">
                    <h2 className="text-xl font-black text-gray-900 mb-6">From the Seller</h2>
                    <div className="flex items-start gap-6">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 uppercase font-black text-2xl text-gray-400 shrink-0">
                            {seller.business_name[0]}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{seller.business_name}</h3>
                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{seller.description}</p>
                            <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-1 text-sm">
                                    <ShieldCheck className="h-4 w-4 text-ratel-green-500" />
                                    <span className="font-semibold text-gray-700">{seller.trust_score}% Trust</span>
                                </div>
                                {seller.verified && (
                                    <Badge className="bg-ratel-green-50 text-ratel-green-700 border-ratel-green-200 text-xs">
                                        ✓ Verified Seller
                                    </Badge>
                                )}
                                <span className="text-xs text-gray-400">Member since {new Date(seller.created_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}</span>
                            </div>
                            <Link href={`/store/${seller.id}`}>
                                <Button variant="outline" size="sm" className="mt-4 rounded-full font-bold text-xs">
                                    Visit Store →
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Similar Products */}
                {similarProducts.length > 0 && (
                    <div className="mt-12 mb-8">
                        <h2 className="text-2xl font-black mb-8">Similar Items</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            {similarProducts.map(p => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <NegotiationModal
                isOpen={isNegotiationOpen}
                onClose={() => setIsNegotiationOpen(false)}
                product={product}
                priceComparison={priceComparison}
            />

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


