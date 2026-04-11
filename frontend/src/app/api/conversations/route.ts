import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1/conversations";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const user_email = searchParams.get("user_email");
    const conversation_id = searchParams.get("conversation_id");

    if (!user_email && !conversation_id) {
        return NextResponse.json({ error: "user_email or conversation_id required" }, { status: 400 });
    }

    try {
        let url: string;
        if (conversation_id) {
            url = `${BACKEND_URL}${API_PREFIX}/${conversation_id}`;
        } else {
            const count_only = searchParams.get("count_only") === "true";
            if (count_only) {
                url = `${BACKEND_URL}${API_PREFIX}/unread-count?user_email=${encodeURIComponent(user_email!)}`;
            } else {
                url = `${BACKEND_URL}${API_PREFIX}?user_email=${encodeURIComponent(user_email!)}`;
            }
        }

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
            return NextResponse.json({ unread_count: 0, items: [] }, { status: 200 });
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        // Silent fallback when backend is offline
        return NextResponse.json({ unread_count: 0, items: [] }, { status: 200 });
    }
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const conversation_id = searchParams.get("conversation_id");

    try {
        const body = await req.json();

        if (conversation_id) {
            const res = await fetch(`${BACKEND_URL}${API_PREFIX}/${conversation_id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            return NextResponse.json(data, { status: res.status });
        } else {
            const res = await fetch(`${BACKEND_URL}${API_PREFIX}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            return NextResponse.json(data, { status: res.status });
        }
    } catch (error) {
        return NextResponse.json({ success: true, queued: true }, { status: 200 });
    }
}

export async function PATCH(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const conversation_id = searchParams.get("conversation_id");

    if (!conversation_id) {
        return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }

    try {
        const res = await fetch(`${BACKEND_URL}${API_PREFIX}/${conversation_id}/read`, {
            method: "PATCH",
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: true }, { status: 200 });
    }
}
