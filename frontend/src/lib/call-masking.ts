import jwt from "jsonwebtoken";

// Twilio Voice — masked, two-leg call bridging. Neither the rider/sender nor
// the driver/courier ever sees the other's real phone number: our Twilio
// number rings the REQUESTER first, and once they answer, Twilio's own
// webhook (see /api/calls/twiml) tells it to dial the OTHER party and bridge
// the two legs. Both sides only ever see the Twilio number on caller ID.
//
// Genuinely gated like the Google Maps key: hasCallMaskingConfig is false
// until a real Twilio account (Account SID + Auth Token + a Twilio voice
// number) is set as env vars — that's a vendor account only the user can
// create and pay for, not something a code change can shortcut.
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const CALL_TOKEN_SECRET = process.env.JWT_SECRET || "fairprice-jwt-secret-change-in-production";

export const hasCallMaskingConfig = !!(ACCOUNT_SID && AUTH_TOKEN && TWILIO_NUMBER);

/** Normalizes a stored WhatsApp/contact number (digits, no leading +) to E.164. */
export function toE164(rawNumber: string): string | null {
    const digits = rawNumber.replace(/\D/g, "");
    if (digits.length < 10) return null;
    return `+${digits}`;
}

interface CallTokenPayload {
    targetE164: string;
    tripKind: "ride" | "delivery";
    tripId: string;
}

/**
 * A short-lived, single-purpose token embedding WHO Twilio's webhook is
 * allowed to dial next. This is the actual security boundary on the public
 * TwiML webhook: without a valid, unexpired token minted by our own
 * authenticated /api/calls/connect, the webhook dials no one — closing the
 * "anyone could hit this URL and make our Twilio account place arbitrary
 * calls at our cost" hole a naive ?to=<number> query param would open.
 */
export function signCallToken(payload: CallTokenPayload): string {
    return jwt.sign(payload, CALL_TOKEN_SECRET, { expiresIn: "3m" });
}

export function verifyCallToken(token: string): CallTokenPayload | null {
    try {
        return jwt.verify(token, CALL_TOKEN_SECRET) as CallTokenPayload;
    } catch {
        return null;
    }
}

/** Places the FIRST leg: Twilio rings the requester's own phone. */
export async function placeMaskedCall(requesterE164: string, twimlUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!hasCallMaskingConfig) return { success: false, error: "Call masking isn't configured" };

    const body = new URLSearchParams({
        To: requesterE164,
        From: TWILIO_NUMBER as string,
        Url: twimlUrl,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Calls.json`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`,
        },
        body,
    });

    if (!res.ok) {
        const detail = await res.json().catch(() => null);
        return { success: false, error: detail?.message || `Twilio call failed (${res.status})` };
    }
    return { success: true };
}
