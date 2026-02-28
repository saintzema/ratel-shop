"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Trash2, ShoppingBag, Plus, Heart, ChevronDown } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { DEMO_PRODUCTS } from "@/lib/data";
import { ConfirmationModal } from "@/components/modals/ConfirmationModal";

export default function CartPage() {
    const { location, deliveryDate } = useLocation();
    const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart, addToCart } = useCart();
    const { toggleFavorite } = useFavorites();
    const router = useRouter();
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [savedMsg, setSavedMsg] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 pb-28 lg:pb-8 flex flex-col lg:flex-row gap-6 relative">
                {/* Left Column: Cart Items */}
                <div className="flex-1 bg-white p-6 rounded shadow-sm border border-gray-200">
                    <h1 className="text-2xl font-bold mb-1">Shopping Cart</h1>
                    <div
                        className="text-sm text-blue-600 hover:underline cursor-pointer mb-4 text-right"
                        onClick={clearCart}
                    >
                        Deselect all items
                    </div>
                    <hr className="border-gray-200 mb-6" />

                    {savedMsg && (
                        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-semibold flex items-center gap-2 animate-in slide-in-from-top">
                            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                            <span>Saved to Favorites! ❤️ <span className="font-normal text-gray-500">({savedMsg})</span></span>
                        </div>
                    )}

                    {cart.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-xl font-medium text-gray-500 mb-4">Your Cart is empty.</p>
                            <Link href="/">
                                <Button>Start Shopping</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {cart.map(({ product, quantity }) => (
                                <div key={product.id} className="flex gap-4 pb-6 border-b border-gray-200 last:border-0 last:pb-0">
                                    {/* Image */}
                                    <Link href={`/product/${product.id}`} className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                                    </Link>

                                    {/* Details */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <Link href={`/product/${product.id}`} className="font-medium text-lg hover:text-brand-orange hover:underline line-clamp-2">
                                                {product.name}
                                            </Link>
                                            <div className="font-bold text-lg">{formatPrice(product.price)}</div>
                                        </div>

                                        <div className="text-sm text-emerald-600 font-bold mb-1">In Stock</div>
                                        <div className="text-xs text-gray-500 mb-2">
                                            Sold by <Link href={`/store/${product.seller_id}`} className="text-blue-600 hover:underline">{product.seller_name}</Link>
                                        </div>

                                        {product.price_flag === "fair" && (
                                            <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full w-fit shadow-sm">
                                                <CheckCircle className="h-3 w-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Fair Price</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 text-sm mt-2 flex-wrap">
                                            <div className="relative">
                                                <select
                                                    className="appearance-none bg-white border-2 border-gray-200 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-3 pr-8 py-2 text-sm font-semibold cursor-pointer transition-all shadow-sm hover:shadow"
                                                    value={quantity}
                                                    onChange={(e) => updateQuantity(product.id, parseInt(e.target.value))}
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                        <option key={n} value={n}>Qty: {n}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                            </div>
                                            <span
                                                className="text-blue-600 hover:underline cursor-pointer border-l pl-3 border-gray-300"
                                                onClick={() => setItemToDelete(product.id)}
                                            >
                                                Delete
                                            </span>
                                            <span
                                                className="text-blue-600 hover:underline cursor-pointer border-l pl-3 border-gray-300"
                                                onClick={() => {
                                                    toggleFavorite(product.id);
                                                    removeFromCart(product.id);
                                                    setSavedMsg(product.name);
                                                    setTimeout(() => setSavedMsg(null), 2500);
                                                }}
                                            >
                                                Save for later
                                            </span>
                                            <span
                                                className="text-blue-600 hover:underline cursor-pointer border-l pl-3 border-gray-300"
                                                onClick={() => router.push(`/search?q=${encodeURIComponent(product.category || product.name)}`)}
                                            >
                                                See more like this
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 text-right text-lg">
                        Subtotal ({cartCount} items): <span className="font-bold">{formatPrice(cartTotal)}</span>
                    </div>

                </div>

                {/* Right Sidebar: Checkout (Desktop Only) */}
                <div className="hidden lg:block w-80 h-fit bg-white p-6 rounded shadow-sm border space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold mb-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Your order qualifies for FREE Shipping</span>
                    </div>

                    <div className="text-sm text-gray-500 pb-2 border-b">
                        Delivery to <span className="font-bold text-black">{location}</span> by <span className="font-bold text-black">{deliveryDate}</span>
                    </div>

                    <div className="text-lg">
                        Subtotal ({cartCount} items): <br />
                        <span className="font-bold">{formatPrice(cartTotal)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        <span>This order contains a gift</span>
                    </div>

                    <Link href="/checkout">
                        <Button className="w-full rounded-full" variant="amazon" disabled={cart.length === 0}>
                            Proceed to Checkout
                        </Button>
                    </Link>

                    {/* Recently Viewed / Recommendations Mini */}
                    <div className="mt-8 pt-4 border-t">
                        <h3 className="font-bold text-sm mb-3">Recommended for you</h3>
                        <div className="space-y-3">
                            {DEMO_PRODUCTS.slice(3, 5).map(p => (
                                <div key={p.id} className="flex gap-2 group items-center">
                                    <Link href={`/product/${p.id}`} className="flex gap-2 flex-1 min-w-0">
                                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
                                            <img src={p.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                                        </div>
                                        <div className="text-xs min-w-0">
                                            <div className="line-clamp-2 mb-1 group-hover:text-brand-orange">{p.name}</div>
                                            <div className="font-bold text-brand-red">{formatPrice(p.price)}</div>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            addToCart(p);
                                            const btn = e.currentTarget;
                                            btn.textContent = '✓';
                                            btn.classList.add('bg-green-500', 'text-white');
                                            setTimeout(() => { btn.textContent = '+'; btn.classList.remove('bg-green-500', 'text-white'); }, 1200);
                                        }}
                                        className="w-7 h-7 rounded-full border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center font-bold text-lg transition-all shrink-0"
                                        title="Add to Cart"
                                    >
                                        +
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Similar Items in Category - Horizontal Scroll */}
            {cart.length > 0 && (() => {
                const cartCategories = [...new Set(cart.map(c => c.product.category).filter(Boolean))];
                const similarProducts = DEMO_PRODUCTS
                    .filter(p => cartCategories.includes(p.category) && !cart.some(c => c.product.id === p.id))
                    .slice(0, 12);
                const primaryCategory = cartCategories[0] || 'electronics';
                if (similarProducts.length === 0) return null;
                return (
                    <>
                        <div className="container mx-auto px-4 mb-8 lg:mb-12 hidden lg:block lg:pb-0">
                            <div className="bg-white rounded p-4 shadow-sm border border-gray-200">
                                <h2 className="text-lg font-bold mb-4">Similar Items in Category</h2>
                                <div className="flex overflow-x-auto gap-4 pb-4 snap-x" style={{ scrollbarWidth: "none" }}>
                                    {similarProducts.map(product => (
                                        <Link key={product.id} href={`/product/${product.id}`} className="shrink-0 w-36 sm:w-48 group snap-start">
                                            <div className="bg-gray-50 rounded aspect-square p-4 mb-2 flex items-center justify-center">
                                                <img src={product.image_url || "/assets/images/placeholder.png"} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-105" onError={e => { e.currentTarget.src = "/assets/images/placeholder.png"; }} />
                                            </div>
                                            <h3 className="text-xs sm:text-sm text-gray-700 line-clamp-2 min-h-[2.5rem] group-hover:text-brand-orange">
                                                {product.name}
                                            </h3>
                                            <p className="font-bold text-sm sm:text-base text-gray-900 mt-1">{formatPrice(product.price)}</p>
                                        </Link>
                                    ))}
                                </div>
                                <div className="text-center mt-2">
                                    <Link href={`/search?q=${encodeURIComponent(primaryCategory)}`}>
                                        <Button variant="outline" className="rounded-full px-8 font-bold text-sm">View More</Button>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="lg:hidden">
                            <div className="container mx-auto px-4 mb-4 pb-0">
                                <div className="bg-white rounded p-4 shadow-sm border border-gray-200">
                                    <h2 className="text-lg font-bold mb-4">Similar Items in Category</h2>
                                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
                                        {similarProducts.map(product => (
                                            <Link key={product.id} href={`/product/${product.id}`} className="shrink-0 w-36 group snap-start">
                                                <div className="bg-gray-50 rounded aspect-square p-4 mb-2 flex items-center justify-center">
                                                    <img src={product.image_url || "/assets/images/placeholder.png"} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-105" onError={e => { e.currentTarget.src = "/assets/images/placeholder.png"; }} />
                                                </div>
                                                <h3 className="text-xs text-gray-700 line-clamp-2 min-h-[2.5rem]">
                                                    {product.name}
                                                </h3>
                                                <p className="font-bold text-sm text-gray-900 mt-1">{formatPrice(product.price)}</p>
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="text-center mt-2">
                                        <Link href={`/search?q=${encodeURIComponent(primaryCategory)}`}>
                                            <Button variant="outline" className="rounded-full px-8 font-bold text-sm w-full">View More</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* Mobile Sticky Checkout Bar */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-[60px] left-0 right-0 bg-white border-t p-4 z-[90] flex items-center justify-between shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)]">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total</p>
                        <p className="text-xl font-black text-brand-orange">{formatPrice(cartTotal)}</p>
                    </div>
                    <Link href="/checkout">
                        <Button className="bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-lg px-8 h-12 shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                            <span>CHECKOUT ({cartCount})</span>
                        </Button>
                    </Link>
                </div>
            )}

            <Footer />

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={() => {
                    if (itemToDelete) removeFromCart(itemToDelete);
                }}
                title="Remove from Cart?"
                description="Are you sure you want to remove this item from your shopping cart?"
                confirmLabel="Delete"
                variant="danger"
            />
        </div>
    );
}
