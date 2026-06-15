import { NextResponse } from "next/server";

const DB_URL = process.env.FIREBASE_DATABASE_URL;
const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET;

// Public proxy to Firebase RTDB — keeps DB credentials server-side only.
// Returns last 30 events ordered by timestamp.
export const dynamic = "force-dynamic";

export async function GET() {
    if (!DB_URL) {
        return NextResponse.json({ events: [], configured: false });
    }

    try {
        const url = `${DB_URL}/zema360/events.json?auth=${DB_SECRET}&orderBy=%22ts%22&limitToLast=30`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
            return NextResponse.json({ events: [], configured: true, error: "Firebase fetch failed" });
        }

        const raw = await res.json();

        if (!raw) {
            return NextResponse.json({ events: [], configured: true });
        }

        // Firebase RTDB returns an object keyed by auto-generated IDs; convert to array
        const events = Object.entries(raw)
            .map(([id, val]) => ({ id, ...(val as object) }))
            .sort((a: any, b: any) => b.ts - a.ts);

        return NextResponse.json({ events, configured: true });
    } catch {
        return NextResponse.json({ events: [], configured: false, error: "Network error" });
    }
}
