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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-ratel-orange" />
            </div>
        );
    }

    return <>{children}</>;
}
