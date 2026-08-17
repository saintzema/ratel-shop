"use client";

import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";
import { useIntegrationStatus } from "@/lib/use-integration-status";

/**
 * Nudge for sellers whose store was auto-drafted by the Sell (+) quick-list flow.
 *
 * That flow deliberately skips onboarding so a first-time seller can publish a
 * product in one go — it invents a placeholder store named "<Their Name>'s Store"
 * with no bank details and no KYC. The cost is that their real store name never
 * gets set, so it leaks into customer-facing surfaces (invoices, the storefront),
 * and they can't be paid out. This is the prompt to finish the job.
 *
 * Hidden the moment the store looks genuinely set up, so an established seller
 * never sees it.
 */
export function CompleteOnboardingAlert({ seller }: { seller: any }) {
    const { flags } = useIntegrationStatus();
    if (!seller) return null;

    const ownerName = (seller.owner_name || "").trim();
    const businessName = (seller.business_name || "").trim();

    // The quick-sell draft names the store "<owner>'s Store" (see /sell). Treat that
    // exact shape, or a missing name, as "never actually onboarded".
    const isPlaceholderName =
        !businessName ||
        businessName === "My Store" ||
        (!!ownerName && businessName.toLowerCase() === `${ownerName.toLowerCase()}'s store`);

    // Payout status comes from the DB, never from the cached seller object —
    // that snapshot is empty on a new device and after our localStorage quota
    // purge, which is why sellers with a bank account on file were repeatedly
    // told to add one. `null` means "not answered yet": assume nothing missing.
    const missingPayout = flags === null ? false : !flags.paystack;

    if (!isPlaceholderName && !missingPayout) return null;

    const what = isPlaceholderName && missingPayout
        ? "Add your store name and payout account"
        : isPlaceholderName
            ? "Give your store its real name"
            : "Add your payout account to get paid";

    const why = isPlaceholderName
        ? "Your store is still using a placeholder name — it shows to customers on your storefront and on every invoice you send."
        : "We can't send you money from sales until a settlement account is on file.";

    return (
        <Link
            href="/seller/onboarding"
            className="order-first flex items-center justify-between gap-3 bg-amber-50 border border-amber-300 rounded-3xl p-4 shadow-sm hover:bg-amber-100/70 transition-colors"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Store className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-black text-amber-900">{what}</p>
                    <p className="text-xs font-semibold text-amber-700 mt-0.5">{why}</p>
                </div>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
        </Link>
    );
}
