"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["customer", "seller", "admin"]}>
            {children}
        </ProtectedRoute>
    );
}
