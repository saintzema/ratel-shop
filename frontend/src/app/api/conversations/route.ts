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
            // Get single conversation with messages
            url = `${BACKEND_URL}${API_PREFIX}/${conversation_id}`;
        } else {
            // Get count only
            const count_only = searchParams.get("count_only") === "true";
            if (count_only) {
                url = `${BACKEND_URL}${API_PREFIX}/unread-count?user_email=${encodeURIComponent(user_email!)}`;
            } else {
                url = `${BACKEND_URL}${API_PREFIX}?user_email=${encodeURIComponent(user_email!)}`;
            }
        }

        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Backend conversation fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const conversation_id = searchParams.get("conversation_id");

    try {
        const body = await req.json();

        if (conversation_id) {
            // Send a message within a conversation
            const res = await fetch(`${BACKEND_URL}${API_PREFIX}/${conversation_id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            return NextResponse.json(data, { status: res.status });
        } else {
            // Create a new conversation
            const res = await fetch(`${BACKEND_URL}${API_PREFIX}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            return NextResponse.json(data, { status: res.status });
        }
    } catch (error) {
        console.error("Backend conversation create error:", error);
        return NextResponse.json({ error: "Failed to create conversation/message" }, { status: 500 });
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
        console.error("Backend conversation read error:", error);
        return NextResponse.json({ error: "Failed to mark conversation as read" }, { status: 500 });
    }
}
