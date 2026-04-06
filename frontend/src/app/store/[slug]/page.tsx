"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { DataSyncService } from "@/lib/sync-store";
import { SEED_PRODUCTS, SEED_SELLERS } from "@/lib/data";
import { Product, Seller } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin,
    Star,
    MessageCircle,
    Clock,
    ShieldCheck,
    Search,
    Filter,
    Package,
    Heart,
    Camera,
    Upload,
    AlertTriangle,
    ShoppingCart,
    HelpCircle
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { Input } from "@/components/ui/input";
import { ContactSellerModal } from "@/components/modals/ContactSellerModal";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";

export default function StoreProfile() {
    const params = useParams();
    const { user } = useAuth();
    const { addToCart } = useCart();
    const router = useRouter();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [priceRange, setPriceRange] = useState({ min: 0, max: 5000000 });
    const [loading, setLoading] = useState(true);
    const [isUpdatingCover, setIsUpdatingCover] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const { isFavoriteStore, toggleFavoriteStore } = useFavorites();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<"products" | "about" | "reviews" | "shipping">("products");
    const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">("newest");

    useEffect(() => {
        const slug = params.slug as string;
        if (!slug) return;

        const loadStore = () => {
            const allSellers = [...DataSyncService.getSellers(), ...SEED_SELLERS];
            // Deduplicate by id, preferring DataSyncService version
            const uniqueSellers = allSellers.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
            // find by store_url OR by ID OR by slugified business name
            const foundSeller = uniqueSellers.find(s =>
                s.store_url === slug || s.id === slug || s.business_name.toLowerCase().replace(/\s+/g, "-") === slug
            );

            if (foundSeller) {
                setSeller(foundSeller);
                const allProducts = [...DataSyncService.getProducts(), ...SEED_PRODUCTS];
                // Deduplicate by id
                const uniqueProducts = allProducts.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
                setProducts(uniqueProducts.filter(p => p.seller_id === foundSeller.id));
            }
            setLoading(false);
        };

        loadStore();
        window.addEventListener("storage", loadStore);
        return () => window.removeEventListener("storage", loadStore);
    }, [params.slug]);

    const isOwner = user && seller && user.id === seller.user_id;

    useEffect(() => {
        if (!seller || !seller.cover_image_urls || seller.cover_image_urls.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % (seller.cover_image_urls?.length || 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [seller]);

    const handleUpdateCover = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!seller || !e.target.files?.[0]) return;
        setIsUpdatingCover(true);
        const file = e.target.files[0];
        const newUrl = URL.createObjectURL(file);

        setTimeout(() => {
            const currentImages = seller.cover_image_urls || (seller.cover_image_url ? [seller.cover_image_url] : []);
            const newImages = [...currentImages, newUrl].slice(-3); // Keep only the latest 3

            DataSyncService.updateSeller(seller.id, { cover_image_urls: newImages, cover_image_url: newImages[0] });
            setSeller(prev => prev ? { ...prev, cover_image_urls: newImages, cover_image_url: newImages[0] } : null);
            setIsUpdatingCover(false);
        }, 1000);
    };

    const handleUpdateLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!seller || !e.target.files?.[0]) return;
        const file = e.target.files[0];
        const newUrl = URL.createObjectURL(file);
        DataSyncService.updateSeller(seller.id, { logo_url: newUrl });
        setSeller(prev => prev ? { ...prev, logo_url: newUrl } : null);
    };

    const filteredProducts = products
        .filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            p.price >= priceRange.min &&
            p.price <= priceRange.max
        )
        .sort((a, b) => {
            if (sortBy === "price-low") return a.price - b.price;
            if (sortBy === "price-high") return b.price - a.price;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#E3E6E6]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-gray-300 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-300 rounded"></div>
                </div>
            </div>
        );
    }

    if (!seller || (seller.status !== "active" && !isOwner)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/30 backdrop-blur-3xl">
                <div className="text-center p-12 bg-white/40 rounded-[40px] border border-white/60 shadow-2xl max-w-md mx-4">
                    <div className="h-20 w-20 bg-gray-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                        <ShieldCheck className="h-10 w-10 text-white opacity-20" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">
                        {!seller ? "Nexus Not Found" : "Store Restricted"}
                    </h1>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                        {!seller
                            ? "This coordinates do not match any known matrix entity."
                            : "This storefront is currently undergoing administrative verification."}
                    </p>
                    <Link href="/">
                        <Button className="mt-10 h-14 px-10 rounded-2xl bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105" variant="default">
                            Return to Nexus
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans pb-10">
            <Navbar />

            {/* Header / Cover */}
            <div className="bg-white shadow-sm border-b border-gray-100 relative z-10">
                <div className="h-48 md:h-80 bg-gray-100 w-full relative overflow-hidden group/cover">
                    <AnimatePresence mode="popLayout">
                        <motion.img
                            key={currentImageIndex}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            src={(seller.cover_image_urls && seller.cover_image_urls.length > 0) ? seller.cover_image_urls[currentImageIndex] : (seller.cover_image_url || "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80")}
                            alt={`${seller.business_name} Cover`}
                            className="w-full h-full object-cover absolute inset-0"
                            style={{ zIndex: 0 }}
                        />
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>

                    {/* Progress indicators for Slider */}
                    {(seller.cover_image_urls?.length || 0) > 1 && (
                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                            {seller.cover_image_urls!.map((_, idx) => (
                                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
                            ))}
                        </div>
                    )}

                    {isOwner && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity z-30 cursor-pointer" onClick={() => document.getElementById("cover-upload")?.click()}>
                            <input type="file" id="cover-upload" accept="image/*" className="hidden" onChange={handleUpdateCover} />
                            <div className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 rounded-2xl flex items-center gap-2 px-6 h-12 font-medium">
                                {isUpdatingCover ? <Upload className="h-5 w-5 animate-bounce" /> : <Camera className="h-5 w-5" />}
                                {isUpdatingCover ? "Uploading..." : "Click to add Cover (Max 3)"}
                            </div>
                        </div>
                    )}
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="-mt-12 md:-mt-16 flex flex-col md:flex-row md:items-end gap-4 pb-4">
                        {/* Avatar */}
                        <div
                            className={`h-28 w-28 md:h-36 md:w-36 rounded-3xl bg-white p-1.5 shadow-2xl relative shrink-0 group/avatar z-30 ${isOwner ? 'cursor-pointer' : ''}`}
                            onClick={() => isOwner && document.getElementById("logo-upload")?.click()}
                        >
                            {isOwner && <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleUpdateLogo} />}
                            <div className="h-full w-full rounded-2xl bg-gradient-to-br from-brand-green-600 to-emerald-500 flex items-center justify-center text-white text-5xl font-bold shadow-inner overflow-hidden relative">
                                {seller.logo_url ? (
                                    <img src={seller.logo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    seller.business_name.charAt(0)
                                )}
                                {isOwner && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                                        <Camera className="h-8 w-8 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1.5 rounded-full border-4 border-white shadow-lg" title="Verified Seller">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left pt-2 md:pt-0">
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none mb-2">
                                {seller.business_name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500 font-medium">
                                <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                    <span className="text-gray-900 font-bold">{seller.rating}</span>
                                    <span>(128 reviews)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" /> Lagos, Nigeria
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                    <Clock className="h-3.5 w-3.5" /> Responds within 1 hr
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-4 md:mt-0 w-full md:w-auto">
                            <Button
                                className="flex-1 md:flex-none bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-full font-bold shadow-lg shadow-brand-green-600/20 px-8 h-12"
                                onClick={() => setShowContactModal(true)}
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Contact Seller
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                className={`h-12 w-12 rounded-full border-gray-200 transition-all ${seller && isFavoriteStore(seller.id)
                                    ? "bg-red-50 border-red-200 hover:bg-red-100"
                                    : "bg-white hover:bg-gray-50"
                                    }`}
                                onClick={() => seller && toggleFavoriteStore(seller.id)}
                            >
                                <Heart className={`h-5 w-5 transition-colors ${seller && isFavoriteStore(seller.id)
                                    ? "fill-red-500 text-red-500"
                                    : ""
                                    }`} />
                            </Button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-8 border-t border-gray-100 text-sm font-bold tracking-wide mt-2">
                        {(["products", "about", "reviews", "shipping"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "py-4 border-b-2 transition-all capitalize",
                                    activeTab === tab ? "border-brand-green-500 text-brand-green-600" : "border-transparent text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {tab === "shipping" ? "Shipping & Returns" : tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar Filters */}
                    <aside className="w-full md:w-60 space-y-6 hidden md:block">
                        <div>
                            <h3 className="font-bold text-gray-900 mb-4">Categories</h3>
                            <div className="space-y-2">
                                {["All Products", "Phones & Tablets", "Electronics", "Fashion", "Beauty"].map((cat, i) => (
                                    <div key={i} className={`flex items-center justify-between group cursor-pointer p-2 rounded-lg transition-colors ${i === 0 ? "bg-white shadow-sm" : "hover:bg-white/50"}`}>
                                        <span className={`text-sm ${i === 0 ? "font-bold text-brand-green-600" : "font-medium text-gray-600 group-hover:text-gray-900"}`}>{cat}</span>
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{i === 0 ? products.length : [3, 5, 7, 2][i - 1] || 4}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-6">Price Range (₦)</h3>
                            <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Min Price</label>
                                    <Input
                                        type="number"
                                        value={priceRange.min}
                                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                                        className="h-10 bg-gray-50 border-none rounded-xl font-bold text-xs"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Max Price</label>
                                    <Input
                                        type="number"
                                        value={priceRange.max}
                                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                                        className="h-10 bg-gray-50 border-none rounded-xl font-bold text-xs"
                                        placeholder="5,000,000"
                                    />
                                </div>
                                <div className="pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPriceRange({ min: 0, max: 5000000 })}
                                        className="w-full h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-gray-100"
                                    >
                                        Reset Filter
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div className="flex-1">
                        {/* Mobile Search & Filter */}
                        <div className="flex flex-wrap md:flex-nowrap gap-3 mb-6 sticky top-[72px] z-20 md:static">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <Input
                                    placeholder={`Search in ${seller.business_name}...`}
                                    className="pl-12 h-12 rounded-full border-none shadow-lg bg-white/90 backdrop-blur-md focus:ring-2 focus:ring-brand-green-500/20 text-base"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="h-12 px-4 rounded-full bg-white border-none shadow-lg text-sm font-bold text-gray-600 outline-none min-w-[140px]"
                            >
                                <option value="newest">Newest First</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                            </select>
                            <Button size="icon" variant="outline" className="h-12 w-12 rounded-full bg-white border-none shadow-lg md:hidden shrink-0">
                                <Filter className="h-5 w-5" />
                            </Button>
                        </div>

                        {activeTab === "products" && (
                            <>
                                {filteredProducts.length === 0 ? (
                                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                                        <Package className="h-16 w-16 mx-auto text-gray-200 mb-4" />
                                        <h3 className="text-lg font-bold text-gray-900">No products found</h3>
                                        <p className="text-gray-500">Try adjusting your search criteria.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                        {filteredProducts.map((product) => (
                                            <Link key={product.id} href={`/product/${product.id}`} className="group block">
                                                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 h-full flex flex-col">
                                                    {/* Image */}
                                                    <div className="aspect-square relative bg-[#F5F5F7] p-4 flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={product.image_url || "/assets/images/placeholder.png"}
                                                            alt={product.name}
                                                            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                        {product.price_flag === "fair" && (
                                                            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-white/70 backdrop-blur-md rounded-full border border-emerald-500/10 shadow-sm font-bold text-[8px] text-emerald-600 uppercase tracking-widest leading-none">
                                                                <ShieldCheck className="h-2.5 w-2.5" />
                                                                Fair Price
                                                            </div>
                                                        )}
                                                        <button className="absolute bottom-2 right-2 h-8 w-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300">
                                                            <Heart className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    {/* Details */}
                                                    <div className="p-3 md:p-5 flex-1 flex flex-col">
                                                        <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 min-h-[2.2rem] text-xs md:text-sm group-hover:text-brand-green-600 transition-colors">
                                                            {product.name}
                                                        </h3>
                                                        <div className="mt-auto pt-2 md:pt-4 space-y-2 md:space-y-3">
                                                            <div className="flex items-end justify-between">
                                                                <div>
                                                                    <p className="text-sm md:text-xl font-black text-gray-900">
                                                                        {formatPrice(product.price)}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        addToCart(product);
                                                                    }}
                                                                    className="h-7 w-7 md:h-9 md:w-9 rounded-full bg-brand-green-50 flex items-center justify-center text-brand-green-600 hover:bg-brand-green-600 hover:text-white transition-all"
                                                                >
                                                                    <ShoppingCart className="h-3.5 w-3.5 md:h-4 w-4" />
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    addToCart(product);
                                                                    router.push('/cart');
                                                                }}
                                                                className="w-full h-8 md:h-9 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-[10px] md:text-xs font-bold tracking-wide transition-all"
                                                            >
                                                                Buy Now
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === "about" && (
                            <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-2xl font-black text-gray-900 mb-6">About {seller.business_name}</h2>
                                <div className="prose prose-emerald max-w-none text-gray-600 font-medium leading-relaxed">
                                    {seller.description ? seller.description.split('\n').map((para, i) => (
                                        <p key={i} className="mb-4">{para}</p>
                                    )) : (
                                        <p>Learn more about our commitment to quality, fair pricing, and excellent service. We are dedicated to providing the best values for our customers.</p>
                                    )}
                                </div>
                                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Location</p>
                                        <p className="font-bold text-gray-800 flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-green-600" /> {seller.location || "Lagos, Nigeria"}</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Member Since</p>
                                        <p className="font-bold text-gray-800 flex items-center gap-2"><Clock className="h-4 w-4 text-brand-green-600" /> {seller.joined_at ? new Date(seller.joined_at).toLocaleDateString() : "March 2026"}</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Verification</p>
                                        <p className="font-bold text-emerald-600 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> FairPrice Verified</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "reviews" && (
                            <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900">Customer Reviews</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star key={star} className={`h-4 w-4 ${star <= (seller.rating || 4.5) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                                                ))}
                                            </div>
                                            <span className="text-lg font-black text-gray-900">{seller.rating || "4.5"}</span>
                                            <span className="text-sm text-gray-400 font-medium">based on 128 global reviews</span>
                                        </div>
                                    </div>
                                    <Button className="h-12 px-8 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-[10px]">Write a Review</Button>
                                </div>

                                <div className="space-y-8">
                                    {[1, 2, 3].map((r) => (
                                        <div key={r} className="pb-8 border-b border-gray-100 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-green-100 to-emerald-100 flex items-center justify-center font-bold text-brand-green-700 text-sm">
                                                        {["A", "B", "C"][r - 1]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{["Adekunle O.", "Blessing E.", "Chimamanda N."][r - 1]}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verified Purchase</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star key={star} className={`h-3 w-3 ${star <= (5 - r + 1) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                                {["Incredible experience shopping with this store. My order arrived exactly on time and the product quality far exceeded my expectations for the price.",
                                                  "Good service, though shipping took an extra day. The communication from the seller side was excellent throughout the delivery process.",
                                                  "Standard professional seller. Items are genuine and properly packaged. Will definitely be ordering from here again."][r - 1]}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                                                <span>Helpful?</span>
                                                <button className="flex items-center gap-1 hover:text-brand-green-600 transition-colors">Yes (12)</button>
                                                <button className="flex items-center gap-1 hover:text-red-500 transition-colors">No (2)</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "shipping" && (
                            <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-2xl font-black text-gray-900 mb-8">Shipping & Returns</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-brand-green-50 flex items-center justify-center shrink-0">
                                                <Package className="h-5 w-5 text-brand-green-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-gray-900 tracking-tight mb-1">Standard Delivery</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">Orders are processed within 24 hours. Lagos delivery takes 1-2 working days. Nationwide delivery takes 3-5 working days.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                                <MapPin className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-gray-900 tracking-tight mb-1">Pickup Information</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">Direct pickup available at our Lagos coordinates. Please verify your order confirmation before arrival.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                                <ShieldCheck className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-gray-900 tracking-tight mb-1">Return Policy</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">3-day return window for items not as described. Product must be in original packaging with all security seals intact.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                                <AlertTriangle className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-gray-900 tracking-tight mb-1">Escrow Guarantee</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">Your payment is held securely in escrow until you confirm satisfaction or 3 days after delivery confirmation.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 p-6 bg-gray-50 rounded-[24px] border border-gray-100 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <HelpCircle className="h-6 w-6 text-gray-400" />
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Need more information?</p>
                                            <p className="text-xs text-gray-500">Our customer support is available 24/7 to help with shipping queries.</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="h-10 rounded-xl border-gray-200 font-bold text-xs uppercase tracking-widest text-gray-600">Contact Help</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* You May Also Like */}
            <YouMayAlsoLike title="Recommended Products" />

            {/* Contact Seller Modal */}
            {seller && (
                <ContactSellerModal
                    isOpen={showContactModal}
                    onClose={() => setShowContactModal(false)}
                    seller={seller}
                />
            )}

            <Footer />
        </div>
    );
}

