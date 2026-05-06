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
                drag="y"
                dragConstraints={{ top: -300, bottom: 300 }}
                dragElastic={0.1}
                dragMomentum={false}
                onClick={() => {
                    if (pathname === "/cart") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                        router.push("/cart");
                    }
                }}
                className="fixed z-[1015] right-4 md:right-8 top-[55%] w-14 h-14 rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-all hover:bg-emerald-700 hover:scale-110 active:scale-95 cursor-pointer"
                style={{ WebkitTapHighlightColor: "transparent", touchAction: "none" }}
            >
                <motion.div
                    animate={isBouncing ? {
                        scale: [1, 1.4, 0.8, 1.2, 1],
                        rotate: [0, -15, 15, -10, 0]
                    } : {}}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                    <ShoppingCart className="h-6 w-6 text-white" strokeWidth={2.5} />
                </motion.div>

                {/* Plus badge — matches recommended product cards */}
                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-emerald-100">
                    <span className="font-black text-emerald-600 text-[11px] leading-none">+</span>
                </div>

                {/* Item count badge */}
                {itemCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        key={itemCount}
                        className="absolute -bottom-1 -right-1 bg-brand-orange text-black text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-cart-bounce"
                    >
                        {itemCount}
                    </motion.div>
                )}
            </motion.button>
        </AnimatePresence>
    );
}
