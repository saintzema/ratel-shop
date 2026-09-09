"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { COUNTRY_TO_CURRENCY, convertFromNgn, formatConverted } from "@/lib/currency";

interface CurrencyContextType {
    /** null on NGN/Nigeria (the default/primary market) — nothing to convert. */
    currencyCode: string | null;
    /** True once both the country and a real rate are known. */
    ready: boolean;
    /** A visitor can override the auto-detected currency (e.g. a Nigerian traveling). */
    setCurrencyCode: (code: string | null) => void;
    /** Converts and formats an NGN amount, or null if there's nothing to show. */
    convert: (amountNgn: number) => string | null;
    /** How many Naira one unit of currencyCode is worth right now, or null. */
    nairaPerUnit: number | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/**
 * International visitors were seeing every price in Naira with nothing to
 * anchor it to — real pain for anyone not already thinking in ₦. This adds a
 * converted-estimate display (see Price component / ProductCard) using a
 * REAL, live NGN-base rate table (see /api/exchange-rate) — never a
 * fabricated conversion. The NGN price stays the one actually charged via
 * Paystack; this is presentation only.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currencyCode, setCurrencyCodeState] = useState<string | null>(null);
    const [rates, setRates] = useState<Record<string, number> | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("fp-currency-override");
        if (saved) {
            setCurrencyCodeState(saved === "NGN" ? null : saved);
        }

        (async () => {
            try {
                const [geoRes, rateRes] = await Promise.all([
                    fetch("/api/geo").then(r => r.ok ? r.json() : null),
                    fetch("/api/exchange-rate").then(r => r.ok ? r.json() : null),
                ]);
                if (rateRes?.rates) setRates(rateRes.rates);

                if (!saved && geoRes?.countryCode) {
                    const detected = COUNTRY_TO_CURRENCY[geoRes.countryCode];
                    // NGN (Nigeria, the primary market) needs no conversion line at all.
                    setCurrencyCodeState(detected && detected !== "NGN" ? detected : null);
                }
            } catch {
                // No rates, no geo — just show NGN as before. Never guess a rate.
            } finally {
                setReady(true);
            }
        })();
    }, []);

    const setCurrencyCode = (code: string | null) => {
        setCurrencyCodeState(code);
        localStorage.setItem("fp-currency-override", code || "NGN");
    };

    const convert = (amountNgn: number): string | null => {
        if (!currencyCode || !rates) return null;
        const amount = convertFromNgn(amountNgn, currencyCode, rates);
        if (amount === null) return null;
        return formatConverted(amount, currencyCode);
    };

    const nairaPerUnit = currencyCode && rates?.[currencyCode] ? 1 / rates[currencyCode] : null;

    return (
        <CurrencyContext.Provider value={{ currencyCode, ready, setCurrencyCode, convert, nairaPerUnit }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error("useCurrency must be used within a CurrencyProvider");
    }
    return context;
}
