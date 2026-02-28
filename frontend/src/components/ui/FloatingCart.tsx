"use client";

import { useCart } from "@/context/CartContext";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function FloatingCart() {
    const { cart, isLoaded } = useCart();
    const router = useRouter();
    const pathname = usePathname();
    const [isBouncing, setIsBouncing] = useState(false);
    const [prevCount, setPrevCount] = useState(0);

    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

    // Trigger bounce effect when count increases
    useEffect(() => {
        if (itemCount > prevCount) {
            setIsBouncing(true);
            const timer = setTimeout(() => setIsBouncing(false), 1000);
            return () => clearTimeout(timer);
        }
        setPrevCount(itemCount);
    }, [itemCount, prevCount]);

    // Hide the floating cart inside the actual cart page, checkout page, product page, admin, or seller paths
    if (pathname === "/cart" || pathname === "/checkout" || pathname?.startsWith("/admin") || pathname?.startsWith("/seller") || pathname?.startsWith("/product/")) {
        return null;
    }

    return (
        <AnimatePresence>
            {itemCount > 0 && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => router.push("/cart")}
                    // Show only on mobile (hidden on md and above) — positioned above Ziva FAB
                    className="md:hidden fixed z-[999] right-4 bottom-[8.5rem] w-14 h-14 bg-gradient-to-tr from-brand-green-600 to-emerald-500 rounded-full shadow-[0_8px_30px_rgba(16,185,129,0.4)] flex items-center justify-center text-white border-2 border-white/20 backdrop-blur-md"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                >
                    <motion.div
                        animate={isBouncing ? {
                            scale: [1, 1.4, 0.8, 1.2, 1],
                            rotate: [0, -15, 15, -10, 0]
                        } : {}}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                        <ShoppingCart className="h-6 w-6" />
                    </motion.div>

                    {/* Badge */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        key={itemCount} // Re-animate badge when count changes
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm"
                    >
                        {itemCount}
                    </motion.div>
                </motion.button>
            )}
        </AnimatePresence>
    );
}
