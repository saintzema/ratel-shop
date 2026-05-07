"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { DataSyncService } from "@/lib/sync-store";
import { Product, ProductCategory } from "@/lib/types";
import { Navbar } from "@/components/layout/Navbar";
import { ShieldCheck, Loader2 } from "lucide-react";

/**
 * /checkout/direct — WeChat-style instant QR checkout
 *
 * This page is opened when a user scans a product QR code.
 * It reconstructs the product from URL parameters, adds it to the cart,
 * and seamlessly redirects to the standard /checkout page.
 *
 * Supported URL params:
 *   productId  — stable product id (e.g. "global-starlink-standard-kit-gen-2")
 *   name       — product name
 *   amount     — price in Naira
 *   image      — product image URL
 *   category   — product category
 */

function DirectCheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { addToCart, cart } = useCart();
    const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const productId = searchParams.get("productId") || "";
        const name = searchParams.get("name") || "";
        const memo = searchParams.get("memo") || "";
        const ref = searchParams.get("ref") || "";
        const amount = Number(searchParams.get("amount")) || 0;
        const image = searchParams.get("image") || "";
        const category = searchParams.get("category") || "general";
        const sellerId = searchParams.get("sellerId") || "";
        const label = searchParams.get("label") || memo || ref || "";

        if (!productId && !name && !sellerId && !label) {
            setStatus("error");
            setErrorMsg("Missing payment information. Please scan a valid QR code.");
            return;
        }

        try {
            // Strategy 1: Check if this product already exists in our local catalogue
            const allProducts = DataSyncService.getApprovedProducts();
            let product = allProducts.find(p => p.id === productId);

            // Strategy 2: Check by name similarity if ID didn't match
            if (!product && name) {
                product = allProducts.find(p =>
                    (p.name || "").toLowerCase() === name.toLowerCase()
                );
            }

            // Strategy 3: Handle Direct Payment (No specific product, just amount + seller)
            if (!product && (sellerId || label)) {
                const sellers = DataSyncService.getSellers();
                const seller = sellers.find(s => s.id === sellerId);
                
                // Use a unique ID for direct payments to allow multiple different payments in one cart
                const uniqueId = productId || `qr-pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                
                const reconstructed: Product = {
                    id: uniqueId,
                    name: label || (name ? name : `Payment to ${seller?.business_name || "Verified Seller"}`),
                    price: amount,
                    original_price: amount,
                    category: (category || "services") as ProductCategory,
                    description: label || `Direct QR payment secured by FairPrice Escrow.`,
                    image_url: image || "SPECIAL:QR_PAYMENT",
                    images: [image || "SPECIAL:QR_PAYMENT"],
                    stock: 9999,
                    seller_id: sellerId || "global-partners",
                    seller_name: seller?.business_name || "Verified Seller",
                    price_flag: "fair",
                    sold_count: 0,
                    review_count: 0,
                    avg_rating: 5.0,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    // @ts-ignore - Dynamic metadata for tracking
                    off_listing: true,
                    // @ts-ignore
                    is_direct_payment: true
                };

                product = reconstructed;
            }

            // Strategy 4: Fallback reconstruction (if no sellerId/label but has productId/name)
            if (!product) {
                const reconstructed: Product = {
                    id: productId || `qr-${Date.now()}`,
                    name: name || "Scanned Product",
                    price: amount,
                    original_price: amount > 0 ? Math.round(amount * 1.15) : 0,
                    category: (category || "electronics") as ProductCategory,
                    description: `Product added via QR scan. Secured by FairPrice Escrow protection.`,
                    image_url: image || "/assets/images/placeholder.png",
                    images: [image || "/assets/images/placeholder.png"],
                    stock: 100,
                    seller_id: "global-partners",
                    seller_name: "Global Stores",
                    price_flag: "fair",
                    sold_count: 0,
                    review_count: 0,
                    avg_rating: 4.5,
                    is_active: true,
                    created_at: new Date().toISOString(),
                };

                product = reconstructed;
            }

            // Ensure product is in local sync for PDP fallbacks if user clicks it
            try {
                DataSyncService.addRawProduct(product, false);
            } catch { /* best effort */ }

            // Add to cart regardless (CartContext handles quantity increments for same IDs)
            // But since we use unique IDs for direct payments, they will appear as separate items
            addToCart(product);

            setStatus("redirecting");

            // Small delay so the user sees the confirmation before redirect
            setTimeout(() => {
                router.replace("/checkout");
            }, 1200);

        } catch (err) {
            console.error("[DirectCheckout] Error:", err);
            setStatus("error");
            setErrorMsg("Something went wrong. Please try scanning again.");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
            <Navbar />
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-sm w-full text-center space-y-6">
                    {status === "loading" && (
                        <>
                            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner animate-pulse">
                                <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900">Processing QR Payment...</h1>
                            <p className="text-gray-500 text-sm font-medium">
                                Verifying product and preparing your secure checkout.
                            </p>
                        </>
                    )}

                    {status === "redirecting" && (
                        <>
                            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                                <ShieldCheck className="h-10 w-10 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900">Product Added!</h1>
                            <p className="text-gray-500 text-sm font-medium">
                                Redirecting to secure checkout...
                            </p>
                            <div className="flex justify-center">
                                <div className="h-1.5 w-48 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full animate-[progressBar_1.2s_ease-in-out_forwards]" />
                                </div>
                            </div>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center shadow-inner">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h1 className="text-2xl font-black text-gray-900">Scan Error</h1>
                            <p className="text-gray-500 text-sm font-medium">{errorMsg}</p>
                            <button
                                onClick={() => router.push("/")}
                                className="mt-4 px-8 py-3 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700 transition-colors"
                            >
                                Go to Homepage
                            </button>
                        </>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes progressBar {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
}

export default function DirectCheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-emerald-50">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
        }>
            <DirectCheckoutContent />
        </Suspense>
    );
}
