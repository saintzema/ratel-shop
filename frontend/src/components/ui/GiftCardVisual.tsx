"use client";

import { useRef } from "react";

interface GiftCardVisualProps {
    code?: string;
    amount?: number;
    recipientName?: string;
    message?: string;
    expiresAt?: string | Date | null;
    /** Show placeholder code if none provided */
    preview?: boolean;
}

export function GiftCardVisual({
    code,
    amount = 2000,
    recipientName,
    message,
    expiresAt,
    preview = false,
}: GiftCardVisualProps) {
    const displayCode = code ?? (preview ? "FP2000-XXXX-XXXX" : "");
    const formattedAmount = amount.toLocaleString("en-NG", { minimumFractionDigits: 0 });
    const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : null;

    return (
        <div
            className="relative w-full select-none overflow-hidden"
            style={{
                aspectRatio: "1.586 / 1",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #064e3b 0%, #065f46 35%, #047857 65%, #059669 100%)",
                boxShadow: "0 20px 60px rgba(5,150,105,0.35), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
        >
            {/* Radial glow blobs */}
            <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "55%", height: "55%", background: "radial-gradient(circle, rgba(52,211,153,0.25) 0%, transparent 70%)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", bottom: "-15%", left: "10%", width: "45%", height: "45%", background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)", borderRadius: "50%" }} />

            {/* Subtle grid pattern */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="gcgrid" width="28" height="28" patternUnits="userSpaceOnUse">
                        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#gcgrid)" />
            </svg>

            {/* Decorative arc */}
            <svg style={{ position: "absolute", bottom: 0, right: 0, width: "55%", height: "90%", opacity: 0.06 }} viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
                <circle cx="200" cy="300" r="180" fill="none" stroke="white" strokeWidth="28" />
                <circle cx="200" cy="300" r="130" fill="none" stroke="white" strokeWidth="14" />
            </svg>

            {/* Main content */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "6.5%" }}>

                {/* Top row — logo + gift tag */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                            {/* FP logo mark */}
                            <div style={{
                                width: "28px", height: "28px", borderRadius: "7px",
                                background: "rgba(255,255,255,0.92)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "11px", fontWeight: 900, color: "#047857",
                                letterSpacing: "-0.03em",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}>FP</div>
                            <span style={{ color: "white", fontWeight: 900, fontSize: "clamp(11px, 2.4vw, 15px)", letterSpacing: "-0.02em", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                                FairPrice
                            </span>
                        </div>
                        <span style={{ color: "rgba(167,243,208,0.85)", fontSize: "clamp(8px, 1.5vw, 10px)", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                            Gift Card
                        </span>
                    </div>

                    {/* Glass tag */}
                    <div style={{
                        background: "rgba(255,255,255,0.12)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "100px",
                        padding: "4px 10px",
                        display: "flex", alignItems: "center", gap: "5px",
                    }}>
                        <span style={{ fontSize: "clamp(7px, 1.3vw, 9px)", fontWeight: 800, color: "rgba(209,250,229,0.95)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                            ★ Welcome Gift
                        </span>
                    </div>
                </div>

                {/* Middle — amount */}
                <div>
                    <div style={{ color: "rgba(167,243,208,0.75)", fontSize: "clamp(8px, 1.4vw, 10px)", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "system-ui, -apple-system, sans-serif", marginBottom: "2px" }}>
                        Value
                    </div>
                    <div style={{
                        color: "white",
                        fontSize: "clamp(26px, 7vw, 46px)",
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        textShadow: "0 2px 16px rgba(0,0,0,0.2)",
                    }}>
                        ₦{formattedAmount}
                    </div>
                    {recipientName && (
                        <div style={{ color: "rgba(167,243,208,0.85)", fontSize: "clamp(9px, 1.6vw, 11px)", fontWeight: 700, marginTop: "4px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                            For {recipientName}
                        </div>
                    )}
                    {message && (
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "clamp(8px, 1.4vw, 10px)", fontWeight: 500, marginTop: "2px", fontFamily: "system-ui, -apple-system, sans-serif", fontStyle: "italic" }}>
                            "{message}"
                        </div>
                    )}
                </div>

                {/* Bottom row — code + expiry */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ color: "rgba(167,243,208,0.7)", fontSize: "clamp(7px, 1.2vw, 9px)", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "4px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                            Code
                        </div>
                        {/* Glass code pill */}
                        <div style={{
                            background: "rgba(0,0,0,0.25)",
                            backdropFilter: "blur(16px)",
                            WebkitBackdropFilter: "blur(16px)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: "10px",
                            padding: "6px 14px",
                            display: "inline-block",
                        }}>
                            <span style={{
                                color: "white",
                                fontSize: "clamp(9px, 1.8vw, 13px)",
                                fontWeight: 900,
                                letterSpacing: "0.18em",
                                fontFamily: "ui-monospace, monospace",
                                opacity: displayCode ? 1 : 0.4,
                            }}>
                                {displayCode || "— — — — — —"}
                            </span>
                        </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                        {expiry && (
                            <>
                                <div style={{ color: "rgba(167,243,208,0.7)", fontSize: "clamp(7px, 1.1vw, 8px)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "2px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                                    Valid Until
                                </div>
                                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "clamp(8px, 1.4vw, 10px)", fontWeight: 800, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                                    {expiry}
                                </div>
                            </>
                        )}
                        <div style={{ color: "rgba(167,243,208,0.5)", fontSize: "clamp(6px, 1vw, 8px)", fontWeight: 600, marginTop: expiry ? "4px" : "0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                            fairprice.ng
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
