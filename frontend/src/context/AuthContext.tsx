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
        localStorage.setItem("fp_user", JSON.stringify(userData));
        setUser(userData);
        window.dispatchEvent(new Event("fp-auth-update"));
    };

    const logout = () => {
        localStorage.removeItem("fp_user");
        setUser(null);
        window.dispatchEvent(new Event("fp-auth-update"));
    };

    const register = (userData: User) => {
        localStorage.setItem("fp_user", JSON.stringify(userData));
        setUser(userData);
        window.dispatchEvent(new Event("fp-auth-update"));
    };

    const updateUser = (userData: Partial<User>) => {
        if (!user) return;
        const updated = { ...user, ...userData };
        localStorage.setItem("fp_user", JSON.stringify(updated));
        setUser(updated);
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
