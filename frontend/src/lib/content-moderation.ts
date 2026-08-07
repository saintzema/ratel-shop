// Lightweight, dependency-free moderation for negotiation/chat messages.
// Blocks the handful of message types that actually cause real harm on a
// buyer-seller marketplace: harassment/slurs, and attempts to route payment
// off-platform (a classic marketplace scam vector — get the buyer to pay
// outside escrow, then never deliver). Not a general-purpose profanity
// filter; it's scoped to what a marketplace chat specifically needs to catch.

const HARASSMENT_TERMS = [
    "fuck you", "fuck off", "kill yourself", "kys", "idiot", "stupid bitch",
    "bastard", "whore", "slut", "bitch ass", "dumb ass",
];

// Off-platform payment redirection — sellers sometimes try to get buyers to
// pay via direct bank transfer / outside Paystack escrow, which strips the
// buyer of FairPrice's dispute/refund protection entirely.
const OFF_PLATFORM_PAYMENT_PATTERNS = [
    /\bsend\s+(money|cash|payment)\s+(directly|to my|via)\b/i,
    /\bpay\s+(me\s+)?directly\b/i,
    /\b(transfer|send)\s+to\s+(my\s+)?(account|acct)\s+number\b/i,
    /\bskip\s+(the\s+)?escrow\b/i,
    /\bavoid\s+(the\s+)?(platform|app|fairprice)\s+fee/i,
];

export interface ModerationResult {
    /** Message must not be persisted/sent at all. */
    blocked: boolean;
    /** Message is allowed through but flagged for admin review. */
    flagged: boolean;
    reason?: string;
}

export function moderateMessageText(text: string): ModerationResult {
    if (!text || typeof text !== "string") {
        return { blocked: false, flagged: false };
    }
    const lower = text.toLowerCase();

    for (const term of HARASSMENT_TERMS) {
        if (lower.includes(term)) {
            return { blocked: true, flagged: true, reason: "harassment_language" };
        }
    }

    for (const pattern of OFF_PLATFORM_PAYMENT_PATTERNS) {
        if (pattern.test(text)) {
            return { blocked: true, flagged: true, reason: "off_platform_payment_attempt" };
        }
    }

    return { blocked: false, flagged: false };
}
