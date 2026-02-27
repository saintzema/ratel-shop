"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

export interface CartItem {
    product: Product;
    quantity: number;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
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

    // Save to local storage on change
    useEffect(() => {
        if (isLoaded) {
            const key = getCartKey(user?.email);
            localStorage.setItem(key, JSON.stringify(cart));
        }
    }, [cart, isLoaded, user?.email]);

    const addToCart = (product: Product, quantity = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { product, quantity }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        setCart(prev => prev.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        ));
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((ctx, item) => ctx + (item.product.price * item.quantity), 0);
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
