"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { DEMO_PRODUCTS } from "@/lib/data";
import { ConfirmationModal } from "@/components/modals/ConfirmationModal";

export default function CartPage() {
    const { location, deliveryDate } = useLocation();
    const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart } = useCart();
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-6">
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

                    {cart.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-xl font-medium text-gray-500 mb-4">Your RatelCart is empty.</p>
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
                                            <Link href={`/product/${product.id}`} className="font-medium text-lg hover:text-ratel-orange hover:underline line-clamp-2">
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

                                        <div className="flex items-center gap-4 text-sm mt-2">
                                            <select
                                                className="bg-gray-100 border border-gray-300 rounded p-1 text-sm shadow-sm focus:ring-ratel-orange focus:border-ratel-orange"
                                                value={quantity}
                                                onChange={(e) => updateQuantity(product.id, parseInt(e.target.value))}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                    <option key={n} value={n}>Qty: {n}</option>
                                                ))}
                                            </select>
                                            <span
                                                className="text-blue-600 hover:underline cursor-pointer border-l pl-4 border-gray-300"
                                                onClick={() => setItemToDelete(product.id)}
                                            >
                                                Delete
                                            </span>
                                            <span className="text-blue-600 hover:underline cursor-pointer border-l pl-4 border-gray-300">Save for later</span>
                                            <span className="text-blue-600 hover:underline cursor-pointer border-l pl-4 border-gray-300">See more like this</span>
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

                {/* Right Sidebar: Checkout */}
                <div className="w-full lg:w-80 h-fit bg-white p-6 rounded shadow-sm border space-y-4">
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
                                <Link key={p.id} href={`/product/${p.id}`} className="flex gap-2 group">
                                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                                        <img src={p.image_url} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-xs">
                                        <div className="line-clamp-2 mb-1 group-hover:text-ratel-orange">{p.name}</div>
                                        <div className="font-bold text-ratel-red">{formatPrice(p.price)}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

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
