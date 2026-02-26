"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ("customer" | "seller" | "admin")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
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
            } else if (allowedRoles && !allowedRoles.includes(user.role)) {
                console.log(`ProtectedRoute: Role mismatch. User role: ${user.role}, Allowed: ${allowedRoles}. Redirecting to /`);
                // User logged in but not authorized
                router.push("/");
            } else {
                console.log("ProtectedRoute: Authorized");
                setIsAuthorized(true);
            }
        }
    }, [user, isLoading, router, pathname, allowedRoles]);

    if (isLoading || !isAuthorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm z-50">
                <Loader2 className="h-10 w-10 animate-spin text-ratel-green-600 mb-4" />
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Authenticating Secure Session...</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Nigeria's AI-regulated fair price platform.</p>
            </div>
        );
    }

    return <>{children}</>;
}
