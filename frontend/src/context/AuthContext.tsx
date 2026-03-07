"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { User } from "@/lib/types";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    register: (userData: User) => void;
    updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initialize from localStorage
        const storedUser = localStorage.getItem("fp_user");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                // Backwards compatibility: Default to customer if role is missing
                if (!parsed.role) {
                    parsed.role = "customer";
                    // Optionally update storage to fix it permanently
                    localStorage.setItem("fp_user", JSON.stringify(parsed));
                }
                setUser(parsed);
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        }
        setIsLoading(false);

        // Synchronize across tabs and state updates
        const handleStorageChange = () => {
            const updatedUser = localStorage.getItem("fp_user");
            if (updatedUser) {
                const parsed = JSON.parse(updatedUser);
                if (!parsed.role) parsed.role = "customer";
                setUser(parsed);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("fp-auth-update", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("fp-auth-update", handleStorageChange);
        };
    }, []);

    const login = (userData: User) => {
        // Transfer any guest negotiations to the logged-in user
        try {
            const stored = localStorage.getItem("fairprice_demo_negotiations");
            if (stored) {
                const negs = JSON.parse(stored);
                let changed = false;
                negs.forEach((n: any) => {
                    if (n.customer_id === "guest" || n.customer_name === "Guest Buyer") {
                        n.customer_id = userData.id || userData.email;
                        n.customer_name = userData.name || userData.email;
                        changed = true;
                    }
                });
                if (changed) localStorage.setItem("fairprice_demo_negotiations", JSON.stringify(negs));
            }
        } catch (e) { /* ignore */ }

        localStorage.setItem("fp_user", JSON.stringify(userData));
        setUser(userData);
        window.dispatchEvent(new Event("fp-auth-update"));
    };

    const logout = () => {
        // Grab the user email BEFORE removing fp_user so we can clear their cart
        const currentEmail = user?.email;

        localStorage.removeItem("fp_user");
        localStorage.removeItem("fp-cart-guest");
        if (currentEmail) {
            localStorage.removeItem(`fp-cart-${currentEmail}`);
        }
        // Also clear seller session
        localStorage.removeItem("fairprice_demo_current_seller");

        setUser(null);
        window.dispatchEvent(new Event("fp-auth-update"));
    };

    const register = (userData: User) => {
        // Transfer any guest negotiations to the newly registered user
        try {
            const stored = localStorage.getItem("fairprice_demo_negotiations");
            if (stored) {
                const negs = JSON.parse(stored);
                let changed = false;
                negs.forEach((n: any) => {
                    if (n.customer_id === "guest" || n.customer_name === "Guest Buyer") {
                        n.customer_id = userData.id || userData.email;
                        n.customer_name = userData.name || userData.email;
                        changed = true;
                    }
                });
                if (changed) localStorage.setItem("fairprice_demo_negotiations", JSON.stringify(negs));
            }
        } catch (e) { /* ignore */ }

        localStorage.setItem("fp_user", JSON.stringify(userData));
        setUser(userData);

        // Persist to Postgres
        fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        }).catch(err => console.error("Failed to persist user:", err));

        window.dispatchEvent(new Event("fp-auth-update"));
    };

    const updateUser = (userData: Partial<User>) => {
        if (!user) return;
        const updated = { ...user, ...userData };
        localStorage.setItem("fp_user", JSON.stringify(updated));
        setUser(updated);

        // Persist to Postgres
        fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
        }).catch(err => console.error("Failed to update user in DB:", err));

        window.dispatchEvent(new Event("fp-auth-update"));
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
