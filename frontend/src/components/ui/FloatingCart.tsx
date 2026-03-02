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

    // Hide the floating cart inside checkout page, admin, or seller paths
    if (pathname === "/checkout" || pathname?.startsWith("/admin") || pathname?.startsWith("/seller")) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                    if (pathname === "/cart") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                        router.push("/cart");
                    }
                }}
                // Show only on mobile (hidden on md and above) — positioned on the right
                className="md:hidden fixed z-[999] right-4 top-[30%] w-14 h-14 bg-gradient-to-tr from-brand-green-600 to-emerald-500 rounded-full shadow-[0_8px_30px_rgba(16,185,129,0.4)] flex flex-col items-center justify-center text-white border-2 border-white/20 backdrop-blur-md pt-0.5"
                style={{ WebkitTapHighlightColor: "transparent" }}
            >
                <motion.div
                    animate={isBouncing ? {
                        scale: [1, 1.4, 0.8, 1.2, 1],
                        rotate: [0, -15, 15, -10, 0]
                    } : {}}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="flex flex-col items-center justify-center gap-0.5"
                >
                    <ShoppingCart className="h-5 w-5" />
                    <span className="text-[9px] font-bold leading-none tracking-wide">Cart</span>
                </motion.div>

                {/* Badge */}
                {itemCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        key={itemCount} // Re-animate badge when count changes
                        className="absolute -top-1 -right-1 bg-brand-orange text-black text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-transparent shadow-sm animate-cart-bounce"
                    >
                        {itemCount}
                    </motion.div>
                )}
            </motion.button>
        </AnimatePresence>
    );
}
