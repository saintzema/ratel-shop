"use client";

import { useParams } from "next/navigation";
import { DEMO_PRODUCTS, DEMO_SELLERS, DEMO_REVIEWS, getDemoPriceComparison } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { useLocation } from "@/context/LocationContext";
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
    Lock
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";


export default function ProductDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const { location } = useLocation();

    const product = DEMO_PRODUCTS.find((p) => p.id === id);
    const seller = DEMO_SELLERS.find((s) => s.id === product?.seller_id);
    const similarProducts = DEMO_PRODUCTS.filter((p) => p.category === product?.category && p.id !== product?.id).slice(0, 4);

    const priceComparison = product ? getDemoPriceComparison(product.id) : null;
    const isGoodDeal = priceComparison ? priceComparison.current_price <= priceComparison.market_avg : false;

    const [mainImage, setMainImage] = useState(product?.image_url);
    const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);

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
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 aspect-square flex items-center justify-center relative overflow-hidden group">
                            <img
                                src={mainImage || product.image_url}
                                alt={product.name}
                                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                            />
                            {product.price_flag !== 'none' && (
                                <div className="absolute top-4 left-4">
                                    <Badge className={`${product.price_flag === 'fair'
                                        ? 'bg-ratel-green-100 text-ratel-green-700 border-ratel-green-200'
                                        : product.price_flag === 'overpriced'
                                            ? 'bg-red-100 text-red-700 border-red-200'
                                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                        } px-3 py-1 text-xs font-bold uppercase tracking-wider`}>
                                        {product.price_flag === 'fair' ? 'Fair Price' : product.price_flag}
                                    </Badge>
                                </div>
                            )}
                            <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                                <Heart className="h-5 w-5 text-gray-400 hover:text-red-500 transition-colors" />
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
                            <Link href={`/seller/${seller.id}`} className="text-sm font-bold text-ratel-green-600 hover:underline mb-1 inline-block">
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
                                        <Badge className={`
                                            ${product.price_flag === 'fair' ? 'bg-ratel-green-100 text-ratel-green-800' :
                                                product.price_flag === 'overpriced' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'}
                                        `}>
                                            {product.price_flag === 'fair' ? 'Good Deal' :
                                                product.price_flag === 'overpriced' ? 'Overpriced' : 'Suspiciously Low'}
                                        </Badge>
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
                                <span>Free delivery to <span className="font-bold text-black border-b border-dashed border-gray-300 cursor-pointer">{location.city}</span> by <span className="font-bold text-ratel-green-600">Wed, Feb 14</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-600 mb-4 font-medium">
                                <CheckCircle className="h-4 w-4" />
                                <span>In Stock ({product.stock} units left)</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button className="w-full rounded-full bg-ratel-orange hover:bg-amber-500 text-black font-bold h-12 text-lg shadow-ratel-glow transition-all hover:scale-[1.02]">
                                    Buy Now
                                </Button>
                                <Button className="w-full rounded-full bg-black hover:bg-gray-800 text-white font-bold h-12 text-lg">
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
                            <Button variant="outline" size="sm" className="ml-auto rounded-full font-bold">View Profile</Button>
                        </div>
                    </div>
                </div>

                {/* Similar Products */}
                {similarProducts.length > 0 && (
                    <div className="mt-24">
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
