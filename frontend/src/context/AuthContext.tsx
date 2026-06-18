"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";

import { User } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";

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

    const { data: session, status: sessionStatus } = useSession();
    const isFirstMount = React.useRef(true);
    // In-memory dedup for handleStorageChange — avoids a localStorage write that fails under quota pressure
    // and would cause every storage event to call setUser(newObject), triggering React #310.
    const lastSyncedUserStr = React.useRef<string | null>(null);

    useEffect(() => {
        // Initial sync on mount
        DataSyncService.syncWithDB();

        // High frequency sync for specific collections on first load to get instant UX
        if (isFirstMount.current) {
            DataSyncService.syncWithDB("products");
            DataSyncService.syncWithDB("sellers");
            isFirstMount.current = false;
        }

        // Periodic sync every 5 minutes (300,000 ms) to balance freshness and Neon DB quotas
        const syncInterval = setInterval(() => {
            DataSyncService.syncWithDB();
        }, 300000);

        return () => clearInterval(syncInterval);
    }, []);

    useEffect(() => {
        // --- NextAuth Sync ---
        // If there's an active NextAuth session, and the current stored fp_user doesn't match, sync it
        if (sessionStatus === "authenticated" && session?.user) {
            let existingRole = "customer";
            const storedUserStr = localStorage.getItem("fp_user");
            let needsSync = true;
            
            if (storedUserStr) {
                try {
                    const parsed = JSON.parse(storedUserStr);
                    if (parsed.role) existingRole = parsed.role; // Preserve existing role!
                    if (parsed.email === session.user.email) needsSync = false;
                } catch (e) { }
            }

            if (needsSync) {
                const oauthUser: User = {
                    id: (session.user as any)?.id || `user_${session.user.email}`,
                    email: session.user.email!,
                    name: session.user.name || "User",
                    role: (session.user as any)?.role || existingRole,
                    avatar_url: session.user.image || undefined,
                    created_at: new Date().toISOString()
                };
                login(oauthUser);
            }
        }
    }, [session, sessionStatus]);

    useEffect(() => {
        // Initialize from localStorage
        const storedUser = localStorage.getItem("fp_user");
        
        // --- Stable Guest Identity Persistence ---
        // We ensure a consistent 'guest' ID is maintained for the browser session.
        // This prevents 'identity jitter' where data might get orphaned across refreshes.
        if (!storedUser) {
            let guestId = localStorage.getItem("fp_guest_id");
            if (!guestId) {
                // Return to a simple, stable identifier with a unique fingerprint
                // This balances the user's need for isolation with the system's need for stability.
                guestId = `guest_${Math.random().toString(36).substring(2, 7)}`;
                localStorage.setItem("fp_guest_id", guestId);
                localStorage.setItem("fp_guest_name", "Guest Buyer");
                console.log(`👤 Auth: Initialized stable guest session: ${guestId}`);
            }
        }

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
    }, []);

    // --- Identity Self-Healing ---
    // If a user is logged in with a temporary 'user_' ID (from DB offline fallback),
    // we attempt to re-verify their identity if the DB is now available.
    useEffect(() => {
        if (!user || !user.id.startsWith("user_") || !user.email) return;

        const recoverIdentity = async () => {
            try {
                const res = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`);
                if (res.ok) {
                    const dbUser = await res.json();
                    if (dbUser && dbUser.id && !dbUser.id.startsWith("user_")) {
                        console.log(`🪄 Auth: Self-healing identity for ${user.email}. Migrating ${user.id} -> ${dbUser.id}`);
                        
                        // We use a simplified migration: just update the ID and Role
                        const updatedUser = { ...user, id: dbUser.id, role: dbUser.role || user.role };
                        
                        // Sync local storage directly
                        localStorage.setItem("fp_user", JSON.stringify(updatedUser));
                        setUser(updatedUser);
                        
                        // Trigger a global sync to refresh lists with the new ID
                        window.dispatchEvent(new Event("fp-auth-update"));
                        DataSyncService.syncWithDB();
                    }
                }
            } catch (e) {
                // DB still offline or lookup failed, try again next time
            }
        };

        // Delay slightly after mount to allow initial syncs to finish
        const timer = setTimeout(recoverIdentity, 3000);
        return () => clearTimeout(timer);
    }, [user?.id, sessionStatus]);

    useEffect(() => {
        // Synchronize across tabs and state updates.
        // Dedup via a ref (not localStorage) so the check never fails under quota pressure.
        // Old approach wrote "fp_user_last_synced" to localStorage — when quota was full that
        // write silently failed, meaning every storage event called setUser(newObj) → React #310.
        const handleStorageChange = () => {
            const updatedUser = localStorage.getItem("fp_user");
            if (updatedUser) {
                if (updatedUser !== lastSyncedUserStr.current) {
                    lastSyncedUserStr.current = updatedUser;
                    try {
                        const parsed = JSON.parse(updatedUser);
                        if (!parsed.role) parsed.role = "customer";
                        setUser(parsed);
                    } catch (e) {
                        console.error("Auth sync error: invalid JSON in storage", e);
                    }
                }
            } else if (lastSyncedUserStr.current !== null) {
                lastSyncedUserStr.current = null;
                setUser(null);
            }
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("fp-auth-update", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("fp-auth-update", handleStorageChange);
        };
    }, []);

    const migrateGuestData = async (userData: User) => {
        try {
            const guestId = localStorage.getItem("fp_guest_id") || "guest";
            const guestName = localStorage.getItem("fp_guest_name") || "Guest Buyer";
            const targetId = userData.id || userData.email;
            const targetName = userData.name || userData.email;

            console.log(`🔑 Auth: Migrating guest data from ${guestId} to ${targetId}`);

            const transferData = (key: string, mapper: (item: any) => any) => {
                const stored = localStorage.getItem(key);
                if (stored) {
                    try {
                        const data = JSON.parse(stored);
                        const updated = data.map(mapper);
                        if (JSON.stringify(data) !== JSON.stringify(updated)) {
                            localStorage.setItem(key, JSON.stringify(updated));
                        }
                    } catch (e) { }
                }
            };

            // 1. Negotiations
            transferData("fairprice_demo_negotiations", (n: any) => {
                if (n.customer_id === guestId || n.customer_id === "guest" || n.customer_name === guestName || n.customer_name === "Guest Buyer") {
                    return { ...n, customer_id: targetId, customer_name: targetName };
                }
                return n;
            });

            // 2. Notifications
            transferData("fairprice_demo_notifications", (n: any) => {
                if (n.userId === guestId || n.userId === "guest" || n.userId === "Guest Buyer") {
                    return { ...n, userId: targetId };
                }
                return n;
            });

            // 3. Conversations
            transferData("fp_conversations", (c: any) => {
                if (c.participants?.includes(guestId) || c.participants?.includes("guest")) {
                    const newParts = c.participants.map((p: string) => (p === guestId || p === "guest") ? targetId : p);
                    const newNames = { ...c.participant_names };
                    if (newNames[guestId]) {
                        newNames[targetId] = targetName;
                        delete newNames[guestId];
                    }
                    if (newNames["guest"]) {
                        newNames[targetId] = targetName;
                        delete newNames["guest"];
                    }
                    const newUnread = { ...c.unread_count };
                    if (newUnread[guestId] !== undefined) {
                        newUnread[targetId] = newUnread[guestId];
                        delete newUnread[guestId];
                    }
                    if (newUnread["guest"] !== undefined) {
                        newUnread[targetId] = newUnread["guest"];
                        delete newUnread["guest"];
                    }
                    return { ...c, participants: newParts, participant_names: newNames, unread_count: newUnread };
                }
                return c;
            });

            // 4. Chat Messages
            transferData("fp_chat_messages", (m: any) => {
                let updated = { ...m };
                if (updated.sender === guestId || updated.sender === "guest") {
                    updated.sender = targetId;
                    updated.sender_name = targetName;
                }
                return updated;
            });

            // 5. Cart Migration (Critical for eCommerce)
            const guestCart = localStorage.getItem("fp-cart-guest");
            if (guestCart) {
                const userCartKey = `fp-cart-${userData.email}`;
                const userCart = localStorage.getItem(userCartKey);
                
                if (!userCart) {
                    // Just move it
                    localStorage.setItem(userCartKey, guestCart);
                } else {
                    // Merge logic
                    try {
                        const gItems = JSON.parse(guestCart);
                        const uItems = JSON.parse(userCart);
                        // Add guest items that aren't already in user cart (by product id)
                        const merged = [...uItems];
                        gItems.forEach((gi: any) => {
                            if (!uItems.find((ui: any) => ui.id === gi.id)) {
                                merged.push(gi);
                            }
                        });
                        localStorage.setItem(userCartKey, JSON.stringify(merged));
                    } catch (e) { }
                }
                localStorage.removeItem("fp-cart-guest");
            }

            // Cleanup ephemeral IDs
            localStorage.removeItem("fp_guest_id");
            localStorage.removeItem("fp_guest_name");

            // Trigger re-sync across the application
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("sync-store-update"));
            DataSyncService.syncWithDB();

            // Migrate Postgres records
            await fetch("/api/auth/migrate-guest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    oldId: guestId,
                    newId: targetId,
                    email: userData.email,
                }),
            }).catch(err => console.error("Guest migration failed:", err));

        } catch (e) { console.error("Data transfer failed", e); }
    };

    const login = async (userData: User) => {
        // Persist user FIRST so subsequent fetches in migrateGuestData have context
        localStorage.setItem("fp_user", JSON.stringify(userData));
        setUser(userData);

        window.pendo?.identify({
            visitor: {
                id: userData.id,
                email: userData.email,
                full_name: userData.name,
                role: userData.role,
                location: userData.location,
                is_premium: userData.isPremium,
                created_at: userData.created_at,
                premium_expires_at: userData.premiumExpiresAt,
            },
        });

        // HOT migration: reconcile guest data with new identity immediately
        await migrateGuestData(userData);
        
        window.dispatchEvent(new Event("fp-auth-update"));
    };

    const logout = () => {
        window.pendo?.clearSession();

        // Grab the user email BEFORE removing fp_user so we can clear their cart
        const currentEmail = user?.email;

        localStorage.removeItem("fp_user");
        localStorage.removeItem("fp-cart-guest");
        if (currentEmail) {
            localStorage.removeItem(`fp-cart-${currentEmail}`);
            if (user?.id) {
                localStorage.removeItem(`fp_saved_addresses_${user.id}`);
            }
        }
        localStorage.removeItem("fp_saved_addresses");

        // Clear ALL negotiations and conversations to ensure no data leaks between accounts or to guest
        try {
            localStorage.removeItem("fairprice_demo_negotiations");
            localStorage.removeItem("fp_conversations");
            localStorage.removeItem("fp_chat_messages");
            localStorage.removeItem("fairprice_demo_orders");
            localStorage.removeItem("fairprice_demo_returns");
            localStorage.removeItem("fairprice_demo_order_messages");
            localStorage.removeItem("fairprice_demo_support_messages");
            
            // CRITICAL: Clear guest IDs on logout to prevent "inheritance" by the next user
            localStorage.removeItem("fp_guest_id");
            localStorage.removeItem("fp_guest_name");
        } catch (e) { /* ignore */ }

        // Also clear seller session
        localStorage.removeItem("fairprice_demo_current_seller");

        setUser(null);
        window.dispatchEvent(new Event("fp-auth-update"));

        // If logged in via NextAuth, also clear NextAuth session
        if (sessionStatus === "authenticated") {
            nextAuthSignOut({ redirect: false });
        }
    };

    const register = async (userData: User) => {
        // Persist user FIRST for context
        localStorage.setItem("fp_user", JSON.stringify(userData));
        setUser(userData);

        window.pendo?.identify({
            visitor: {
                id: userData.id,
                email: userData.email,
                full_name: userData.name,
                role: userData.role,
                location: userData.location,
                is_premium: userData.isPremium,
                created_at: userData.created_at,
                premium_expires_at: userData.premiumExpiresAt,
            },
        });

        // HOT migration for new account creation
        await migrateGuestData(userData);

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
