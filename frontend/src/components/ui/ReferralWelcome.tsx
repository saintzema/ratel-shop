"use client";

import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";

const DISMISS_KEY = "fp_referral_banner_dismissed";

/**
 * Tells someone who arrived on a referral link that they arrived on a
 * referral link.
 *
 * Before this, `?ref=` wrote a code to localStorage and showed the visitor
 * nothing whatsoever — so the person being referred had no idea they had been
 * invited, no idea what was expected of them, and no reason to finish. A
 * referral programme the referred half cannot see is not a programme.
 *
 * The copy states what the code actually does: the reward goes to the friend
 * who invited them, and it unlocks on this visitor's first completed order.
 * Overstating it would just move the disappointment further down the funnel.
 */
export function ReferralWelcome() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // The ?ref= param is read directly, not just the stored copy. The
        // homepage writes that code to localStorage in its OWN effect, and
        // effect order between sibling components isn't guaranteed — reading
        // only storage meant the banner was missing on the very visit that
        // matters, the first one from the link.
        let ref: string | null = null;
        try {
            ref = new URLSearchParams(window.location.search).get("ref")
                || localStorage.getItem("fp_referral");
            if (ref && localStorage.getItem(DISMISS_KEY) === ref) ref = null;
        } catch { /* private mode — no banner, no crash */ }
        if (ref) setShow(true);
    }, []);

    if (!show) return null;

    const dismiss = () => {
        try {
            const ref = new URLSearchParams(window.location.search).get("ref")
                || localStorage.getItem("fp_referral");
            if (ref) localStorage.setItem(DISMISS_KEY, ref);
        } catch { /* ignore */ }
        setShow(false);
    };

    return (
        <div className="mx-4 md:mx-auto md:max-w-3xl mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <Gift className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-amber-900">A friend invited you to FairPrice</p>
                <p className="text-xs text-amber-800 mt-0.5">
                    Shop as normal — nothing extra to do. When your first order is complete, your friend gets a
                    ₦5,000 credit as a thank you. Your invite stays linked to this device until then.
                </p>
            </div>
            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 text-amber-500 hover:text-amber-700"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
