"use client";

import Link from "next/link";
import { DEMO_PRODUCTS } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "@/context/LocationContext";

export default function CartPage() {
    const { location, deliveryDate } = useLocation();
    // Mock cart items derived from demo products
    const cartItems = [
        { product: DEMO_PRODUCTS[0], quantity: 1 },
        { product: DEMO_PRODUCTS[2], quantity: 2 },
        { product: DEMO_PRODUCTS[5], quantity: 1 },
    ];

    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-6">
                {/* Left Column: Cart Items */}
                <div className="flex-1 bg-white dark:bg-zinc-900 p-6 rounded shadow-sm border dark:border-zinc-800">
                    <h1 className="text-2xl font-bold mb-1">Shopping Cart</h1>
                    <div className="text-sm text-blue-600 hover:underline cursor-pointer mb-4 text-right">Deselect all items</div>
                    <hr className="border-gray-200 dark:border-zinc-800 mb-6" />

                    <div className="space-y-6">
                        {cartItems.map(({ product, quantity }) => (
                            <div key={product.id} className="flex gap-4 pb-6 border-b dark:border-zinc-800 last:border-0 last:pb-0">
                                {/* Image */}
                                <Link href={`/product/${product.id}`} className="w-32 h-32 flex-shrink-0 bg-gray-100 dark:bg-zinc-800 rounded overflow-hidden">
                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
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
                                        Sold by <Link href="#" className="text-blue-600 hover:underline">{product.seller_name}</Link>
                                    </div>

                                    {product.price_flag === "fair" && (
                                        <Badge variant="success" className="mb-2 text-xs">Fair Price ✅</Badge>
                                    )}

                                    <div className="flex items-center gap-4 text-sm mt-2">
                                        <select
                                            className="bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded p-1 text-sm shadow-sm focus:ring-ratel-orange focus:border-ratel-orange"
                                            defaultValue={quantity}
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                <option key={n} value={n}>Qty: {n}</option>
                                            ))}
                                        </select>
                                        <span className="text-blue-600 hover:underline cursor-pointer border-l pl-4 border-gray-300">Delete</span>
                                        <span className="text-blue-600 hover:underline cursor-pointer border-l pl-4 border-gray-300">Save for later</span>
                                        <span className="text-blue-600 hover:underline cursor-pointer border-l pl-4 border-gray-300">See more like this</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-right text-lg">
                        Subtotal ({totalItems} items): <span className="font-bold">{formatPrice(subtotal)}</span>
                    </div>
                </div>

                {/* Right Sidebar: Checkout */}
                <div className="w-full lg:w-80 h-fit bg-white dark:bg-zinc-900 p-6 rounded shadow-sm border dark:border-zinc-800 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold mb-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Your order qualifies for FREE Shipping</span>
                    </div>

                    <div className="text-sm text-gray-500 pb-2 border-b dark:border-zinc-800">
                        Delivery to <span className="font-bold text-black dark:text-white">{location}</span> by <span className="font-bold text-black dark:text-white">{deliveryDate}</span>
                    </div>

                    <div className="text-lg">
                        Subtotal ({totalItems} items): <br />
                        <span className="font-bold">{formatPrice(subtotal)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        <span>This order contains a gift</span>
                    </div>

                    <Link href="/checkout">
                        <Button className="w-full rounded-full" variant="amazon">
                            Proceed to Checkout
                        </Button>
                    </Link>

                    {/* Recently Viewed / Recommendations Mini */}
                    <div className="mt-8 pt-4 border-t dark:border-zinc-800">
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
        </div>
    );
}
