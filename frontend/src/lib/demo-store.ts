"use client";

import { NegotiationRequest, Order, Product, Seller } from "./types";
import { DEMO_NEGOTIATIONS, DEMO_ORDERS, DEMO_PRODUCTS, DEMO_SELLERS } from "./data";

class DemoStoreService {
    private static instance: DemoStoreService;
    private readonly STORAGE_KEYS = {
        NEGOTIATIONS: "ratel_demo_negotiations",
        ORDERS: "ratel_demo_orders",
        SELLERS: "ratel_demo_sellers",
        PRODUCTS: "ratel_demo_products",
        CURRENT_SELLER: "ratel_demo_current_seller",
    };

    private constructor() {
        if (typeof window !== "undefined") {
            this.init();
        }
    }

    public static getInstance(): DemoStoreService {
        if (!DemoStoreService.instance) {
            DemoStoreService.instance = new DemoStoreService();
        }
        return DemoStoreService.instance;
    }

    private init() {
        if (!localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS)) {
            localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(DEMO_NEGOTIATIONS));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.ORDERS)) {
            localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(DEMO_ORDERS));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.SELLERS)) {
            localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(DEMO_SELLERS));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.PRODUCTS)) {
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(DEMO_PRODUCTS));
        }
    }

    // --- Negotiations ---
    getNegotiations(sellerId?: string): NegotiationRequest[] {
        if (typeof window === "undefined") return DEMO_NEGOTIATIONS;
        const all = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS) || "[]");
        if (!sellerId) return all;

        // Join with products to filter by seller
        const products = this.getProducts();
        return all.filter((n: NegotiationRequest) => {
            const product = products.find(p => p.id === n.product_id);
            return product?.seller_id === sellerId;
        });
    }

    addNegotiation(request: NegotiationRequest) {
        const current = this.getNegotiations();
        const updated = [request, ...current];
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
        // Also trigger storage event for other tabs
        window.dispatchEvent(new Event("storage"));
    }

    updateNegotiationStatus(id: string, status: "accepted" | "rejected") {
        const current = this.getNegotiations();
        const updated = current.map(n => n.id === id ? { ...n, status } : n);
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    // --- Login ---
    loginSeller(sellerId: string) {
        localStorage.setItem(this.STORAGE_KEYS.CURRENT_SELLER, sellerId);
        window.dispatchEvent(new Event("storage"));
    }

    getCurrentSellerId(): string | null {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(this.STORAGE_KEYS.CURRENT_SELLER);
    }

    getCurrentSeller(): Seller | undefined {
        const id = this.getCurrentSellerId();
        if (!id) return undefined;
        const sellers = this.getSellers();
        return sellers.find(s => s.id === id);
    }

    logout() {
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_SELLER);
        window.dispatchEvent(new Event("storage"));
    }

    // --- Getters ---
    getProducts(): Product[] {
        if (typeof window === "undefined") return DEMO_PRODUCTS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || JSON.stringify(DEMO_PRODUCTS));
    }

    getSellers(): Seller[] {
        if (typeof window === "undefined") return DEMO_SELLERS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SELLERS) || JSON.stringify(DEMO_SELLERS));
    }
}

export const DemoStore = DemoStoreService.getInstance();
