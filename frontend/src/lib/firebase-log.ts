// Firebase Realtime Database REST logger — no SDK, no npm package, just fetch.
// Used for the Google Cloud product requirement (XPRIZE) and the ZEMA 360 live ops dashboard.
// Setup: add FIREBASE_DATABASE_URL + FIREBASE_DATABASE_SECRET to Vercel env.
// RTDB security rules: { "rules": { "zema360": { ".read": true, ".write": false }, "zema360/events": { ".write": "auth != null" } } }

const DB_URL = process.env.FIREBASE_DATABASE_URL?.replace(/\/$/, "");
const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET;

export type ZemaEventType =
    | 'gemini_query'
    | 'price_verified'
    | 'order_created'
    | 'escrow_released'
    | 'negotiation'
    | 'agent_decision'
    | 'whatsapp_sent';

export interface ZemaEvent {
    type: ZemaEventType;
    description: string;
    product?: string;
    mode?: string;
    model?: string;
    count?: number;
    value?: number;
    ts: number;
}

export async function logZemaEvent(event: Omit<ZemaEvent, 'ts'>): Promise<void> {
    if (!DB_URL || !DB_SECRET) return;
    try {
        await fetch(`${DB_URL}/zema360/events.json?auth=${DB_SECRET}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...event, ts: Date.now() }),
        });
    } catch {
        // Fire-and-forget — never block the main request
    }
}
