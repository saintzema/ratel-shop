"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DataSyncService } from "@/lib/sync-store";
import { Loader2 } from "lucide-react";

// Single entry point for the "Sell" button (mobile nav + desktop navbar).
// Any signed-in user can tap it, even a pure buyer who's never been a
// seller — this is the "create the product first, finish store setup
// after" flow instead of the old "onboard as a seller before you can list
// anything" order.
export default function SellEntryPage() {
    const router = useRouter();
    const { user, updateUser, isLoading } = useAuth();
    const started = useRef(false);

    useEffect(() => {
        if (isLoading || started.current) return;

        if (!user) {
            // login/page.tsx's redirect continuation reads `from` (not `redirect`) —
            // landing back here re-runs this effect once signed in, which then
            // proceeds with whichever branch below actually applies.
            router.replace("/login?from=/sell");
            return;
        }

        started.current = true;

        const existingSeller = DataSyncService.getCurrentSeller();
        if (existingSeller) {
            router.replace("/seller/products/new");
            return;
        }

        // First time selling — auto-draft a minimal seller record so product
        // creation has a store to attach to, without forcing the full
        // onboarding form (bank details, KYC) before they've even decided
        // what they're selling. Status stays "pending" until they finish
        // onboarding right after creating the product (see the quickSell
        // branch in seller/products/new and seller/onboarding).
        const draftSeller = {
            id: `s_${user.id}`,
            user_id: user.id,
            business_name: user.name ? `${user.name}'s Store` : "My Store",
            owner_name: user.name,
            owner_email: user.email,
            description: "",
            category: "other",
            verified: false,
            trust_score: 50,
            status: "pending" as const,
            kyc_status: "not_submitted" as const,
            created_at: new Date().toISOString(),
        };

        DataSyncService.addSeller(draftSeller as any);
        updateUser({ role: "seller" });

        // Small buffer so the role update lands before /seller/*'s route guard
        // (which checks user.role) evaluates on the next page.
        setTimeout(() => {
            router.replace("/seller/products/new?quickSell=1");
        }, 300);
    }, [user, isLoading, router, updateUser]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-green-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">Setting things up...</p>
            </div>
        </div>
    );
}
