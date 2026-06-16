"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface FavoritesContextType {
    // Product favorites
    favorites: string[];
    toggleFavorite: (productId: string) => void;
    isFavorite: (productId: string) => boolean;
    favoritesCount: number;
    // Store favorites
    favoriteStores: string[];
    toggleFavoriteStore: (sellerId: string) => void;
    isFavoriteStore: (sellerId: string) => boolean;
    favoriteStoresCount: number;
}

const FavoritesContext = createContext<FavoritesContextType>({
    favorites: [],
    toggleFavorite: () => { },
    isFavorite: () => false,
    favoritesCount: 0,
    favoriteStores: [],
    toggleFavoriteStore: () => { },
    isFavoriteStore: () => false,
    favoriteStoresCount: 0,
});

const PRODUCTS_KEY = "fp_demo_favorites";
const STORES_KEY = "fp_favorite_stores";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [favoriteStores, setFavoriteStores] = useState<string[]>([]);
    // Each persist effect needs its own "skip first run" flag — a single shared
    // `loaded` ref set true by the load effect would already read true by the time
    // these effects first run, causing a spurious write+dispatch on every mount.
    const favoritesSkipFirst = React.useRef(true);
    const storesSkipFirst = React.useRef(true);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const storedProducts = localStorage.getItem(PRODUCTS_KEY);
            if (storedProducts) setFavorites(JSON.parse(storedProducts));
            const storedStores = localStorage.getItem(STORES_KEY);
            if (storedStores) setFavoriteStores(JSON.parse(storedStores));
        } catch {
            // ignore parse errors
        }
    }, []);

    // Persist products to localStorage
    useEffect(() => {
        if (favoritesSkipFirst.current) { favoritesSkipFirst.current = false; return; }
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(favorites));
        window.dispatchEvent(new Event("sync-store-update"));
    }, [favorites]);

    // Persist stores to localStorage
    useEffect(() => {
        if (storesSkipFirst.current) { storesSkipFirst.current = false; return; }
        localStorage.setItem(STORES_KEY, JSON.stringify(favoriteStores));
        window.dispatchEvent(new Event("sync-store-update"));
    }, [favoriteStores]);

    const toggleFavorite = useCallback((productId: string) => {
        setFavorites(prev =>
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    }, []);

    const isFavorite = useCallback((productId: string) => {
        return favorites.includes(productId);
    }, [favorites]);

    const toggleFavoriteStore = useCallback((sellerId: string) => {
        setFavoriteStores(prev =>
            prev.includes(sellerId) ? prev.filter(id => id !== sellerId) : [...prev, sellerId]
        );
    }, []);

    const isFavoriteStore = useCallback((sellerId: string) => {
        return favoriteStores.includes(sellerId);
    }, [favoriteStores]);

    return (
        <FavoritesContext.Provider value={{
            favorites, toggleFavorite, isFavorite, favoritesCount: favorites.length,
            favoriteStores, toggleFavoriteStore, isFavoriteStore, favoriteStoresCount: favoriteStores.length,
        }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error("useFavorites must be used within a FavoritesProvider");
    }
    return context;
}
