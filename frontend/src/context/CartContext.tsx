"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

export interface CartItem {
    product: Product;
    quantity: number;
    negotiatedPrice?: number;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number, negotiatedPrice?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    isLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getCartKey(userEmail?: string | null): string {
    return userEmail ? `fp-cart-${userEmail}` : "fp-cart-guest";
}

/**
 * Strip heavy fields before persisting a product to localStorage cart.
 * Checkout only needs identity, price, image, and seller routing —
 * not description/highlights/specs/full images array.
 * Keeps cart storage at ~300 bytes/item instead of 5–10 KB.
 */
function leanProduct(product: Product): Product {
    const {
        description: _d,
        highlights: _h,
        specs: _s,
        images: _imgs,
        sold_count: _sc,
        review_count: _rc,
        avg_rating: _ar,
        source_url: _su,
        recommended_price: _rp,
        // @ts-ignore — internal hydration flags
        _imageHydrated: _ih,
        _hydratedFromPool: _hfp,
        _source: _src,
        cached_at: _ca,
        cache_query: _cq,
        ...lean
    } = product as any;
    // Ensure image_url is set from images array if the field itself is empty
    if (!lean.image_url && _imgs?.[0]) lean.image_url = _imgs[0];
    return lean as Product;
}

/** Safe wrapper — silently swallows QuotaExceededError so it never crashes renders. */
function safeCartSetItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        if (e?.name === "QuotaExceededError" || e?.code === 22 || e?.code === 1014) {
            console.warn(`[Cart] localStorage quota exceeded for ${key} — cart not persisted this write.`);
        } else {
            throw e;
        }
    }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const { user } = useAuth();

    // Load cart for the current user on mount AND when user changes (login/logout)
    useEffect(() => {
        const key = getCartKey(user?.email);
        const savedCart = localStorage.getItem(key);
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart", e);
                setCart([]);
            }
        } else {
            setCart([]);
        }
        setIsLoaded(true);
    }, [user?.email]);

    // Save to localStorage on change
    useEffect(() => {
        if (isLoaded) {
            const key = getCartKey(user?.email);
            safeCartSetItem(key, JSON.stringify(cart));
            window.dispatchEvent(new Event("cart-updated"));
        }
    }, [cart, isLoaded, user?.email]);

    const addToCart = (product: Product, quantity = 1, negotiatedPrice?: number) => {
        setCart(prev => {
            let next: CartItem[];
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                next = prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity, negotiatedPrice: negotiatedPrice || item.negotiatedPrice }
                        : item
                );
            } else {
                next = [...prev, { product: leanProduct(product), quantity, negotiatedPrice }];
            }

            // PERSIST IMMEDIATELY: Crucial for redirects (window.location.href)
            const key = getCartKey(user?.email);
            safeCartSetItem(key, JSON.stringify(next));
            window.dispatchEvent(new Event("cart-updated"));

            return next;
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const next = prev.filter(item => item.product.id !== productId);
            const key = getCartKey(user?.email);
            safeCartSetItem(key, JSON.stringify(next));
            window.dispatchEvent(new Event("cart-updated"));
            return next;
        });
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        setCart(prev => {
            const next = prev.map(item =>
                item.product.id === productId ? { ...item, quantity } : item
            );
            const key = getCartKey(user?.email);
            safeCartSetItem(key, JSON.stringify(next));
            window.dispatchEvent(new Event("cart-updated"));
            return next;
        });
    };

    const clearCart = () => {
        setCart([]);
        const key = getCartKey(user?.email);
        localStorage.removeItem(key);
        window.dispatchEvent(new Event("cart-updated"));
    };

    const cartTotal = cart.reduce((ctx, item) => ctx + ((item.negotiatedPrice || item.product.price) * item.quantity), 0);
    const cartCount = cart.reduce((ctx, item) => ctx + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, isLoaded }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
