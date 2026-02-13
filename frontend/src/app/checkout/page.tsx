"use client";

import Link from "next/link";
import { DEMO_PRODUCTS, DEMO_NEGOTIATIONS } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Lock, ChevronRight, CreditCard, Tag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div>Loading checkout...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const negotiationId = searchParams.get("negotiationId");

    // Default to first product or find negotiated one
    let product = DEMO_PRODUCTS[0];
    let price = product.price;
    let isNegotiated = false;

    if (negotiationId) {
        const negotiation = DEMO_NEGOTIATIONS.find(n => n.id === negotiationId);
        if (negotiation) {
            const negotiatedProduct = DEMO_PRODUCTS.find(p => p.id === negotiation.product_id);
            if (negotiatedProduct) {
                product = negotiatedProduct;
                price = negotiation.proposed_price;
                isNegotiated = true;
            }
        }
    }

    const subtotal = price;
    const shipping = 2500;
    const total = subtotal + shipping;

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
            {/* Simplified Header for Checkout */}
            <header className="border-b bg-gradient-to-b from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-950 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-2xl font-bold text-ratel-green-600 dark:text-white">RatelShop</Link>
                    <h1 className="text-xl font-medium text-gray-600 dark:text-gray-400">Checkout (3 items)</h1>
                </div>
                <Lock className="text-gray-400 h-5 w-5" />
            </header>

            <main className="flex-1 container mx-auto max-w-5xl px-4 py-8 flex flex-col lg:flex-row gap-8">

                {/* Left Column: Checkout Steps */}
                <div className="flex-1 space-y-6">

                    {/* Step 1: Address */}
                    <div className="flex gap-4">
                        <div className="font-bold text-lg w-6 pt-1">1</div>
                        <div className="flex-1">
                            <h2 className="font-bold text-lg mb-2 text-ratel-orange">Shipping address</h2>
                            <div className="border rounded px-4 py-3 text-sm space-y-1">
                                <p className="font-bold">Zema User</p>
                                <p>123 Lekki Phase 1</p>
                                <p>Lagos, Nigeria</p>
                                <p>Phone: +234 801 234 5678</p>
                                <div className="mt-2 text-blue-600 hover:underline cursor-pointer text-xs">Edit address</div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-800" />

                    {/* Step 2: Payment */}
                    <div className="flex gap-4">
                        <div className="font-bold text-lg w-6 pt-1">2</div>
                        <div className="flex-1">
                            <h2 className="font-bold text-lg mb-2 text-ratel-orange">Payment method</h2>
                            <div className="border rounded p-4 space-y-3">
                                <div className="flex items-center gap-3 p-3 border border-orange-200 bg-orange-50 rounded">
                                    <input type="radio" name="payment" checked readOnly className="h-4 w-4 text-ratel-orange" />
                                    <CreditCard className="h-5 w-5 text-gray-600" />
                                    <div>
                                        <div className="font-bold text-sm">Pay with Card / Bank Transfer</div>
                                        <div className="text-xs text-gray-500">Secured by Paystack</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 border opacity-60">
                                    <input type="radio" name="payment" disabled className="h-4 w-4" />
                                    <div>
                                        <div className="font-bold text-sm">Pay on Delivery</div>
                                        <div className="text-xs text-gray-500">Not available for this order amount</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Input placeholder="Enter discount code" className="max-w-xs" />
                                    <Button variant="outline">Apply</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-800" />

                    {/* Step 3: Review */}
                    <div className="flex gap-4">
                        <div className="font-bold text-lg w-6 pt-1">3</div>
                        <div className="flex-1">
                            <h2 className="font-bold text-lg mb-4 text-ratel-orange">Review items and shipping</h2>

                            <div className="border rounded p-4 mb-4 bg-white">
                                <div className="flex justify-between mb-2">
                                    <h3 className="font-bold">Delivery: Feb 14, 2026</h3>
                                    <span className="text-xs text-gray-500">Items shipped from Ratel Fulfillment</span>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded border">
                                        <img src={product.image_url} className="w-full h-full object-contain p-1" />
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-bold">{product.name}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-ratel-red font-bold">{formatPrice(price)}</div>
                                            {isNegotiated && (
                                                <div className="text-[10px] bg-ratel-green-100 text-ratel-green-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                    <Tag className="h-3 w-3" /> Negotiated Price
                                                </div>
                                            )}
                                        </div>
                                        {isNegotiated && (
                                            <div className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</div>
                                        )}
                                        <div>Qty: 1</div>
                                    </div>
                                </div>
                            </div>

                            <Link href="/order-confirmation">
                                <Button size="lg" className="rounded-md bg-ratel-orange hover:bg-amber-500 text-black font-medium">
                                    Place your order
                                </Button>
                            </Link>
                            <p className="text-xs text-gray-500 mt-2">
                                By placing your order, you agree to RatelShop's privacy notice and conditions of use.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Right Column: Order Summary Stick */}
                <div className="w-full lg:w-72">
                    <div className="border rounded p-4 sticky top-6 bg-gray-50 dark:bg-zinc-900 shadow-sm">
                        <Button className="w-full rounded-md mb-4 bg-ratel-orange hover:bg-amber-500 text-black font-bold">
                            Place your order
                        </Button>
                        <p className="text-xs text-center text-gray-500 mb-4 border-b pb-4">
                            By placing your order, you agree to RatelShop's privacy notice and conditions of use.
                        </p>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Items (1):</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping & handling:</span>
                                <span>{formatPrice(shipping)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total before tax:</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Estimated tax:</span>
                                <span>₦0.00</span>
                            </div>
                            <hr className="my-2" />
                            <div className="flex justify-between text-lg font-bold text-ratel-red">
                                <span>Order Total:</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            <div className="py-8 bg-gray-100 dark:bg-zinc-900 border-t text-center text-xs text-gray-500">
                <p className="mb-2"><span className="text-blue-600 underline">Conditions of Use</span> | <span className="text-blue-600 underline">Privacy Notice</span> | <span className="text-blue-600 underline">Help</span></p>
                <p>&copy; 2026, RatelShop.com, Inc. or its affiliates</p>
            </div>
        </div>
    );
}
