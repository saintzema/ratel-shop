import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1/notifications";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const user_email = searchParams.get("user_email");
    const unread_only = searchParams.get("unread_only") || "false";

    if (!user_email) {
        return NextResponse.json({ error: "user_email is required" }, { status: 400 });
    }

    // Check if we just want the count
    const count_only = searchParams.get("count_only") === "true";
    const endpoint = count_only ? `${API_PREFIX}/unread-count` : API_PREFIX;

    try {
        const url = new URL(endpoint, BACKEND_URL);
        url.searchParams.set("user_email", user_email);
        if (!count_only) {
            url.searchParams.set("unread_only", unread_only);
        }

        const res = await fetch(url.toString(), { cache: "no-store" });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Backend notification fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const res = await fetch(`${BACKEND_URL}${API_PREFIX}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("Backend notification create error:", error);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const notification_id = searchParams.get("id");
    const mark_all = searchParams.get("mark_all") === "true";
    const user_email = searchParams.get("user_email");

    try {
        let url: string;
        if (mark_all && user_email) {
            url = `${BACKEND_URL}${API_PREFIX}/mark-all-read?user_email=${encodeURIComponent(user_email)}`;
        } else if (notification_id) {
            url = `${BACKEND_URL}${API_PREFIX}/${notification_id}/read`;
        } else {
            return NextResponse.json({ error: "id or mark_all+user_email required" }, { status: 400 });
        }

        const res = await fetch(url, { method: "PATCH" });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Backend notification update error:", error);
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
    }
}
