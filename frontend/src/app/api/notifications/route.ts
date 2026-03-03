import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1/notifications";

async function safeFetch(url: string, options?: RequestInit): Promise<any> {
    try {
        const res = await fetch(url, { ...options, signal: AbortSignal.timeout(60000) });
        const text = await res.text();
        try {
            return { data: JSON.parse(text), status: res.status };
        } catch {
            console.error(`Backend returned non-JSON (${res.status}):`, text.slice(0, 100));
            return { data: null, status: res.status };
        }
    } catch (error) {
        console.error("Backend unreachable:", (error as Error).message);
        return { data: null, status: 503 };
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const user_email = searchParams.get("user_email");
    const unread_only = searchParams.get("unread_only") || "false";

    if (!user_email) {
        return NextResponse.json({ error: "user_email is required" }, { status: 400 });
    }

    const count_only = searchParams.get("count_only") === "true";
    const endpoint = count_only ? `${API_PREFIX}/unread-count` : API_PREFIX;

    const url = new URL(endpoint, BACKEND_URL);
    url.searchParams.set("user_email", user_email);
    if (!count_only) {
        url.searchParams.set("unread_only", unread_only);
    }

    const { data, status } = await safeFetch(url.toString());

    if (data === null) {
        // Backend down — return safe fallback
        return NextResponse.json(count_only ? { unread_count: 0 } : [], { status: 200 });
    }
    return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, status } = await safeFetch(`${BACKEND_URL}${API_PREFIX}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (data === null) {
            return NextResponse.json({ ok: false, error: "Backend unavailable" }, { status: 200 });
        }
        return NextResponse.json(data, { status });
    } catch (error) {
        console.error("Notification create error:", error);
        return NextResponse.json({ ok: false }, { status: 200 });
    }
}

export async function PATCH(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const notification_id = searchParams.get("id");
    const mark_all = searchParams.get("mark_all") === "true";
    const user_email = searchParams.get("user_email");

    let url: string;
    if (mark_all && user_email) {
        url = `${BACKEND_URL}${API_PREFIX}/mark-all-read?user_email=${encodeURIComponent(user_email)}`;
    } else if (notification_id) {
        url = `${BACKEND_URL}${API_PREFIX}/${notification_id}/read`;
    } else {
        return NextResponse.json({ error: "id or mark_all+user_email required" }, { status: 400 });
    }

    const { data } = await safeFetch(url, { method: "PATCH" });
    if (data === null) {
        return NextResponse.json({ ok: false }, { status: 200 });
    }
    return NextResponse.json(data);
}
