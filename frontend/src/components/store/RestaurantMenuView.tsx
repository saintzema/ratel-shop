"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, X, ShoppingBag } from "lucide-react";
import { Product, Seller } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

/**
 * Scan-a-QR-and-order menu layout for a food seller — the left category rail
 * plus scrollable dish sections that Meituan/food-delivery apps use, requested
 * explicitly so a restaurant's storefront reads as a menu rather than a
 * generic product grid. Only rendered when Seller.category === "restaurants"
 * (see store/[slug]/page.tsx); every other seller keeps the standard grid.
 *
 * Deliberately reuses Product as-is (name/price/image/description/subcategory)
 * rather than inventing a separate "menu item" model — a dish is a product,
 * a menu section is just its subcategory. Add-ons/extras (seen in the
 * reference screenshots) aren't built: there's no data model for them yet,
 * and a fake/non-functional extras picker would be worse than not having one.
 */
export function RestaurantMenuView({ products, seller }: { products: Product[]; seller: Seller }) {
    const { addToCart, cart } = useCart();
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<string>("");
    const [pickedDish, setPickedDish] = useState<Product | null>(null);
    const [qty, setQty] = useState(1);
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scrollingRef = useRef(false);

    const sections = useMemo(() => {
        const map = new Map<string, Product[]>();
        for (const p of products) {
            const key = (p as any).subcategory || "Menu";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(p);
        }
        return Array.from(map.entries());
    }, [products]);

    useEffect(() => {
        if (!activeSection && sections.length > 0) setActiveSection(sections[0][0]);
    }, [sections, activeSection]);

    const scrollToSection = (name: string) => {
        scrollingRef.current = true;
        setActiveSection(name);
        sectionRefs.current[name]?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => { scrollingRef.current = false; }, 600);
    };

    // Highlight the rail entry for whichever section is currently on screen.
    useEffect(() => {
        const onScroll = () => {
            if (scrollingRef.current) return;
            let closest: string | null = null;
            let closestTop = Infinity;
            for (const [name, el] of Object.entries(sectionRefs.current)) {
                if (!el) continue;
                const top = Math.abs(el.getBoundingClientRect().top - 140);
                if (top < closestTop) { closestTop = top; closest = name; }
            }
            if (closest) setActiveSection(closest);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const storeCartCount = cart.filter(c => c.product.seller_id === seller.id).reduce((s, c) => s + c.quantity, 0);
    const storeCartTotal = cart.filter(c => c.product.seller_id === seller.id).reduce((s, c) => s + c.quantity * (c.negotiatedPrice ?? c.product.price), 0);

    const openDish = (p: Product) => { setPickedDish(p); setQty(1); };
    const closeDish = () => setPickedDish(null);
    const confirmAdd = () => {
        if (!pickedDish) return;
        addToCart(pickedDish, qty);
        closeDish();
    };

    return (
        <div className="relative">
            <div className="flex gap-0 -mx-4 sm:-mx-6 lg:-mx-8 min-h-[60vh]">
                {/* Category rail */}
                <nav className="w-24 sm:w-36 shrink-0 bg-gray-50 border-r border-gray-100 sticky top-[110px] self-start max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
                    {sections.map(([name, items]) => (
                        <button
                            key={name}
                            onClick={() => scrollToSection(name)}
                            className={cn(
                                "w-full text-left px-3 py-4 text-[11px] sm:text-xs font-bold leading-tight border-l-4 transition-colors",
                                activeSection === name
                                    ? "border-brand-orange bg-white text-brand-green-700"
                                    : "border-transparent text-gray-500 hover:bg-gray-100"
                            )}
                        >
                            {name}
                            <span className="block text-[9px] font-semibold text-gray-400 mt-0.5">{items.length}</span>
                        </button>
                    ))}
                </nav>

                {/* Dish sections */}
                <div className="flex-1 min-w-0 px-4 sm:px-6 pb-28">
                    {sections.map(([name, items]) => (
                        <div key={name} ref={el => { sectionRefs.current[name] = el; }} className="pt-4 pb-2 scroll-mt-[110px]">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">{name}</h3>
                            <div className="space-y-4">
                                {items.map(dish => (
                                    <button
                                        key={dish.id}
                                        onClick={() => openDish(dish)}
                                        className="w-full flex items-center gap-4 text-left bg-white rounded-2xl p-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <img
                                            src={dish.image_url || "/assets/images/placeholder.png"}
                                            alt={dish.name}
                                            className="h-20 w-20 rounded-xl object-cover shrink-0 bg-gray-100"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{dish.name}</p>
                                            {dish.sold_count > 0 && (
                                                <p className="text-[11px] text-gray-400 mt-1">{dish.sold_count} sold</p>
                                            )}
                                            <p className="text-brand-green-700 font-black mt-1.5">{formatPrice(dish.price)}</p>
                                        </div>
                                        <div className="h-9 w-9 rounded-full bg-brand-orange text-white flex items-center justify-center shrink-0">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating cart bar */}
            {storeCartCount > 0 && (
                <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-30">
                    <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingBag className="h-6 w-6" />
                                <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-brand-orange text-[9px] font-black flex items-center justify-center">{storeCartCount}</span>
                            </div>
                            <span className="font-black">{formatPrice(storeCartTotal)}</span>
                        </div>
                        <button
                            onClick={() => router.push("/cart")}
                            className="bg-brand-orange text-white font-black text-sm px-5 py-2 rounded-xl"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}

            {/* Dish quick-add sheet */}
            {pickedDish && (
                <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center" onClick={closeDish}>
                    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                            <img src={pickedDish.image_url || "/assets/images/placeholder.png"} alt={pickedDish.name} className="w-full h-56 object-cover bg-gray-100" />
                            <button onClick={closeDish} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <h3 className="font-black text-lg text-gray-900">{pickedDish.name}</h3>
                            {pickedDish.description && <p className="text-sm text-gray-500 leading-relaxed">{pickedDish.description}</p>}
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xl font-black text-brand-green-700">{formatPrice(pickedDish.price)}</span>
                                <div className="flex items-center gap-3 bg-gray-100 rounded-full px-2 py-1">
                                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center">
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="font-bold w-5 text-center">{qty}</span>
                                    <button onClick={() => setQty(q => q + 1)} className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center">
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={confirmAdd}
                                className="w-full h-12 rounded-2xl bg-brand-orange text-white font-black mt-2"
                            >
                                Add to Cart · {formatPrice(pickedDish.price * qty)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
