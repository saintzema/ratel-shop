import { NextResponse } from "next/server";

const DB_URL = process.env.FIREBASE_DATABASE_URL?.replace(/\/$/, "");
const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET;

// Public proxy to Firebase RTDB — keeps DB credentials server-side only.
// Returns last 30 events ordered by timestamp.
export const dynamic = "force-dynamic";

export async function GET() {
    if (!DB_URL) {
        return NextResponse.json({ events: [], configured: false });
    }

    try {
        // No orderBy — avoids requiring a .indexOn rule in RTDB security rules.
        // We sort and limit client-side instead.
        const url = `${DB_URL}/zema360/events.json?auth=${DB_SECRET}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return NextResponse.json({ events: [], configured: true, error: `Firebase ${res.status}: ${errText.slice(0, 120)}` });
        }

        const raw = await res.json();

        if (!raw) {
            return NextResponse.json({ events: [], configured: true });
        }

        // Firebase RTDB returns an object keyed by auto-generated push IDs; convert, sort, cap.
        const events = Object.entries(raw)
            .map(([id, val]) => ({ id, ...(val as object) }))
            .sort((a: any, b: any) => b.ts - a.ts)
            .slice(0, 30);

        return NextResponse.json({ events, configured: true });
    } catch {
        return NextResponse.json({ events: [], configured: false, error: "Network error" });
    }
}
