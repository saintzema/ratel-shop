"use client";

import { useEffect, useState } from "react";

export interface IntegrationFlags {
    paystack: boolean;
    instagram: boolean;
    facebook: boolean;
    whatsapp: boolean;
    custom_domain: boolean;
}

export interface IntegrationStatus {
    /** null until the server has answered — never treat this as "nothing connected". */
    flags: IntegrationFlags | null;
    loading: boolean;
    refresh: () => void;
}

/**
 * Server truth for "what has this seller actually set up?".
 *
 * Every setup alert on the dashboard used to test the localStorage seller
 * snapshot. That snapshot is a cache: it is empty on a new device, it is
 * cleared by our own quota purge, and it never contains OAuth tokens (those are
 * written server-side by the callbacks). So a seller with a bank account,
 * a WhatsApp number and a connected Instagram was repeatedly told to add all
 * three — the data was never lost, the page was just asking the wrong source.
 *
 * The `null` state matters as much as the data: alerts must render nothing
 * until this resolves, so a slow network shows no alert rather than a false one.
 */
export function useIntegrationStatus(): IntegrationStatus {
    const [flags, setFlags] = useState<IntegrationFlags | null>(null);
    const [loading, setLoading] = useState(true);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const token = localStorage.getItem("fp_token");
                if (!token) { if (!cancelled) setLoading(false); return; }

                const res = await fetch("/api/seller/integrations/status", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) { if (!cancelled) setLoading(false); return; }

                const data = await res.json();
                const i = data?.integrations || {};
                if (cancelled) return;
                setFlags({
                    paystack: !!i.paystack?.connected,
                    instagram: !!i.instagram?.connected,
                    facebook: !!i.facebook?.connected,
                    whatsapp: !!i.whatsapp?.connected,
                    custom_domain: !!i.custom_domain?.connected,
                });
            } catch {
                // Leave flags null — the caller shows no alert rather than a wrong one.
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [nonce]);

    return { flags, loading, refresh: () => setNonce(n => n + 1) };
}
