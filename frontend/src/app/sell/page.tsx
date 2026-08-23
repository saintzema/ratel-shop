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
        // Narrowed once here: the draft helper below is a nested function, and TS
        // cannot carry the null-check for `user` across that boundary.
        const currentUser = user;

        // Does this user ALREADY own a store? Answer that properly before drafting.
        //
        // This used to ask getCurrentSeller(), which reads the localStorage
        // CURRENT_SELLER key. That key is absent on a new device and after our
        // quota purge, so an established seller looked brand new and this flow
        // drafted a second store at `s_${user.id}`. That is precisely how the
        // duplicate rows in production were created — one owner ended up with a
        // real store (bank details, WhatsApp, 300 products) plus two empty
        // placeholders, and every "which seller is this?" lookup could then pick
        // the wrong one. Check what the user actually owns, locally first, then
        // the database, and only draft when there genuinely is nothing.
        const resume = (sellerId: string) => {
            DataSyncService.loginSeller(sellerId);
            router.replace("/seller/products/new");
        };

        const localStore = DataSyncService.pickPrimarySeller(
            DataSyncService.findSellersForUser(user.id, user.email)
        );
        if (localStore) {
            resume(localStore.id);
            return;
        }

        // Nothing locally — the store may simply not be synced to this device yet.
        (async () => {
            try {
                const res = await fetch("/api/sellers?all=true");
                if (res.ok) {
                    const rows = await res.json();
                    if (Array.isArray(rows)) {
                        const mine = rows.filter((s: any) =>
                            s.user_id === user.id || s.userId === user.id ||
                            s.owner_email === user.email || s.ownerEmail === user.email
                        );
                        if (mine.length > 0) {
                            const rank = (s: any) => {
                                let n = 0;
                                if ((s.bank_name || s.bankName) && (s.account_number || s.accountNumber)) n += 8;
                                if (s.verified === true) n += 4;
                                if (s.status === "active") n += 2;
                                if (s.whatsapp_number || s.whatsappNumber) n += 1;
                                return n;
                            };
                            const best = mine.sort((a: any, b: any) => rank(b) - rank(a))[0];
                            try { DataSyncService.addSeller(best); } catch { /* already present */ }
                            updateUser({ role: "seller" });
                            resume(best.id);
                            return;
                        }
                    }
                }
            } catch {
                // Offline: fall through and draft. Worst case is a placeholder the
                // resolver will rank below the real store once sync catches up.
            }
            createDraftStore();
        })();
        return;

        // First time selling — auto-draft a minimal seller record so product
        // creation has a store to attach to, without forcing the full
        // onboarding form (bank details, KYC) before they've even decided
        // what they're selling. Status stays "pending" until they finish
        // onboarding right after creating the product (see the quickSell
        // branch in seller/products/new and seller/onboarding).
        function createDraftStore() {
        const draftSeller = {
            id: `s_${currentUser.id}`,
            user_id: currentUser.id,
            business_name: currentUser.name ? `${currentUser.name}'s Store` : "My Store",
            owner_name: currentUser.name,
            owner_email: currentUser.email,
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
        }
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
