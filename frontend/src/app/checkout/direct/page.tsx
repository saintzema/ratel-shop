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
        const run = async () => {
        const productId = searchParams.get("productId") || "";
        const name = searchParams.get("name") || "";
        const memo = searchParams.get("memo") || "";
        const ref = searchParams.get("ref") || "";
        const amount = Number(searchParams.get("amount")) || 0;
        let image = searchParams.get("image") || "";
        const category = searchParams.get("category") || "general";
        const sellerId = searchParams.get("sellerId") || searchParams.get("seller_id") || "";
        const label = searchParams.get("label") || searchParams.get("description") || memo || ref || "";

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
                // Local cache lookup only works if THIS device has already browsed this
                // seller before — for a customer scanning someone else's QR for the first
                // time, this is always empty. Fall back to a live fetch so the seller's
                // real logo shows instead of silently defaulting to a placeholder.
                let seller = DataSyncService.getSellers().find(s => s.id === sellerId);
                // Previously skipped this fetch whenever `image` was present, on the
                // assumption the only thing it's needed for is the logo — but it's also
                // the only source of the seller's real business_name. Every WhatsApp-
                // generated payment QR always embeds an image param, so that skip meant
                // those QR payments NEVER got the real store name, always showing the
                // generic "Verified Seller" fallback below despite a real sellerId.
                if (!seller && sellerId) {
                    try {
                        const res = await fetch(`/api/sellers/${encodeURIComponent(sellerId)}`);
                        if (res.ok) {
                            const fresh = await res.json();
                            if (fresh?.id) seller = fresh;
                        }
                    } catch { /* best effort — falls through to brand fallback below */ }
                }

                // Deterministic per-QR id (seller + amount + label) — NOT time-random.
                // addToCart() below already increments quantity when the id matches an
                // existing cart line, so scanning the SAME QR twice now bumps qty instead
                // of adding a duplicate line, while a genuinely different QR (different
                // seller/amount/label) still gets its own distinct id/line. If the item
                // was removed from cart, this same id just re-adds it fresh at qty 1.
                const qrIdentity = `${sellerId || "global"}-${amount}-${(label || name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                const uniqueId = `qr-pay-${qrIdentity}`.slice(0, 80).replace(/-+$/, "");

                // Priority: image param (dashboard/WhatsApp QR already embeds the seller's
                // logo when one exists) -> freshly-fetched seller logo -> FairPrice brand
                // mark (much friendlier than a gray placeholder box for a payment "product").
                const productImage = image || (seller as any)?.logo_url || (seller as any)?.logoUrl || "/logo.png";

                const reconstructed: Product = {
                    id: uniqueId,
                    name: label || (name ? name : `Payment to ${seller?.business_name || "Verified Seller"}`),
                    price: amount,
                    original_price: amount,
                    category: (category || "services") as ProductCategory,
                    description: label || `Direct QR payment secured by FairPrice Escrow.`,
                    image_url: productImage,
                    images: [productImage],
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
                    image_url: image || "/logo.png",
                    images: [image || "/logo.png"],
                    stock: 100,
                    seller_id: "global-partners",
                    seller_name: "Global Stores",
                    price_flag: "fair",
                    sold_count: 0,
                    review_count: 0,
                    avg_rating: 4.5,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    // @ts-ignore
                    is_direct_payment: true
                };

                product = reconstructed;
            }

            // persist:false meant this ephemeral QR/direct-payment product was cached
            // in THIS browser only, never sent to the server. Order has a hard,
            // non-nullable foreign key to Product, so every order for a QR/direct
            // payment silently failed to create server-side (FK violation, swallowed
            // by the fire-and-forget sync) — the order never existed anywhere except
            // Paystack's own transaction log. persist:true actually saves it.
            try {
                DataSyncService.addRawProduct(product, true);
            } catch { /* best effort */ }

            // When `amount` differs from the product's listed price (e.g. WhatsApp negotiation),
            // pass it as negotiatedPrice so checkout shows the agreed price, not the listed price.
            const negotiatedPrice = amount > 0 && amount !== product.price ? amount : undefined;
            addToCart(product, 1, negotiatedPrice);

            // Track QR checkout initiated
            if (typeof window !== "undefined" && (window as any).pendo) {
                (window as any).pendo.track("qr_checkout_initiated", {
                    product_id: product.id,
                    product_name: product.name,
                    amount: amount || product.price,
                    seller_id: product.seller_id || "",
                    is_direct_payment: !!(product as any).is_direct_payment,
                    has_negotiated_price: !!negotiatedPrice,
                    category: product.category || "",
                });
            }

            setStatus("redirecting");

            // Hard navigation so the Next.js router cache is cleared.
            // Without this, scanning the same QR a second time serves the stale
            // cached component and the useEffect never re-fires — the item never
            // gets re-added after being removed from cart. addToCart already writes
            // to localStorage synchronously, so this only needs to clear one paint —
            // shortened from 1200ms since QR-scanning customers are impatient.
            setTimeout(() => {
                window.location.href = "/checkout";
            }, 300);

        } catch (err) {
            console.error("[DirectCheckout] Error:", err);
            setStatus("error");
            setErrorMsg("Something went wrong. Please try scanning again.");
        }
        };
        run();
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
