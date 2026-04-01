"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DemoStore } from "@/lib/demo-store";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ("customer" | "seller" | "admin")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading, updateUser } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        console.log("ProtectedRoute check:", { isLoading, user, pathname, allowedRoles });
        if (!isLoading) {
            if (!user) {
                console.log("ProtectedRoute: No user, redirecting to login");
                // Redirect to login with return URL
                const returnUrl = encodeURIComponent(pathname);
                router.push(`/login?returnUrl=${returnUrl}`);
            } else {
                let isRoleAllowed = !allowedRoles || allowedRoles.includes(user.role);

                // Self-healing check for legacy customers who already own a store but the DB missed their role upgrade
                if (!isRoleAllowed && allowedRoles?.includes("seller") && user.role === "customer") {
                    const allSellers = DemoStore.getSellers();
                    const myStore = allSellers.find(s => s.user_id === user.id || s.owner_email === user.email);
                    if (myStore) {
                        console.log("ProtectedRoute: Auto-healing legacy customer to seller role");
                        updateUser({ role: "seller" });
                        isRoleAllowed = true;
                    }
                }

                if (!isRoleAllowed) {
                    // Self-healing: check if the DB has upgraded their role since their local session was created
                    fetch(`/api/users?email=${encodeURIComponent(user.email)}`)
                        .then(res => res.json())
                        .then(dbUser => {
                            if (dbUser && dbUser.role && allowedRoles && allowedRoles.includes(dbUser.role)) {
                                console.log(`ProtectedRoute: Auto-healing session to match DB role [${dbUser.role}]`);
                                updateUser({ role: dbUser.role });
                                setIsAuthorized(true);
                            } else {
                                console.log(`ProtectedRoute: Role mismatch. User role: ${user.role}, Allowed: ${allowedRoles}. Redirecting to /`);
                                router.push("/");
                            }
                        })
                        .catch(() => {
                            console.log("ProtectedRoute: Failed to verify DB role. Redirecting.");
                            router.push("/");
                        });
                } else {
                    // SECURITY LOCKDOWN: Even if local role IS allowed, if it's a high-privilege role (admin/seller), 
                    // double-check with DB to prevent 'localStorage' tampering.
                    if (user.role === "admin" || (user.role === "seller" && allowedRoles?.includes("seller"))) {
                         fetch(`/api/users?email=${encodeURIComponent(user.email)}`)
                            .then(res => res.json())
                            .then(dbUser => {
                                if (!dbUser || dbUser.role !== user.role) {
                                    console.error("SECURITY: Local role mismatch detected! Reverting to DB state.");
                                    if (dbUser && dbUser.role) {
                                        updateUser({ role: dbUser.role });
                                    } else {
                                        router.push("/login");
                                    }
                                } else {
                                    setIsAuthorized(true);
                                }
                            })
                            .catch(e => {
                                console.warn("Background security check failed. Assuming persistent session.");
                                setIsAuthorized(true);
                            });
                    } else {
                        console.log("ProtectedRoute: Authorized (Low Privilege)");
                        setIsAuthorized(true);
                    }
                }
            }
        }
    }, [user, isLoading, router, pathname, allowedRoles]); // Deliberately omit updateUser to prevent infinite loops

    if (isLoading || !isAuthorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm z-50">
                <Loader2 className="h-10 w-10 animate-spin text-brand-green-600 mb-4" />
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Authenticating Secure Session...</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Nigeria's AI-regulated fair price platform.</p>
            </div>
        );
    }

    return <>{children}</>;
}
