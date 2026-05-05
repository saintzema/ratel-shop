import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

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
        if (!url.includes("localhost")) {
            console.error("Backend unreachable:", (error as Error).message);
        }
        return { data: null, status: 503 };
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const user_email = searchParams.get("user_email") || searchParams.get("userId");
    const unread_only = searchParams.get("unread_only") || "false";
    const user_id = searchParams.get("userId"); // Extra capture for logging/alias

    if (!user_email && !user_id) {
        return NextResponse.json({ error: "user_email or userId is required" }, { status: 400 });
    }
    
    // Resolve email if userId was provided but email is needed for DB lookups
    const effective_email = user_email; 

    const count_only = searchParams.get("count_only") === "true";
    const endpoint = count_only ? `${API_PREFIX}/unread-count` : API_PREFIX;

    const url = new URL(endpoint, BACKEND_URL);
    if (user_email) {
        url.searchParams.set("user_email", user_email);
    }
    if (!count_only) {
        url.searchParams.set("unread_only", unread_only);
    }

    // 1. Fetch from Django Backend
    const backendResult = await safeFetch(url.toString());
    
    // 2. Fetch from Prisma (Next.js local DB)
    let prismaNotifications: any[] = [];
    if (user_email) {
        try {
            const prismaNotifs = await db.notification.findMany({
                where: {
                    user: { email: user_email },
                    ...(unread_only === "true" ? { read: false } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            prismaNotifications = prismaNotifs.map(n => ({
                id: n.id,
                user_id: user_email,
                type: n.type.toLowerCase(),
                message: n.message,
                link: n.link,
                read: n.read,
                created_at: n.createdAt.toISOString()
            }));
        } catch (e) {
            console.error("Prisma notification fetch failed:", e);
        }
    }

    if (count_only) {
        const backendCount = backendResult.data?.unread_count || 0;
        const prismaCount = prismaNotifications.length; // Prisma query already filtered by unread_only above if unread_only was true
        // But wait, if unread_only was false but count_only was true, we need to be careful.
        // Actually count_only should probably just return the unread count.
        return NextResponse.json({ unread_count: backendCount + prismaCount });
    }

    // 3. Merge and De-duplicate
    const backendNotifs = Array.isArray(backendResult.data) ? backendResult.data : [];
    const combined = [...prismaNotifications, ...backendNotifs];
    
    // Sort by timestamp descending
    combined.sort((a, b) => {
        const dateA = new Date(a.created_at || a.timestamp).getTime();
        const dateB = new Date(b.created_at || b.timestamp).getTime();
        return dateB - dateA;
    });

    return NextResponse.json(combined.slice(0, 50), { status: 200 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, type, message, link, userEmail } = body;

        // 1. Sync to Prisma if we have a user identity
        const effectiveEmail = userEmail || userId;
        if (effectiveEmail && effectiveEmail.includes("@")) {
            try {
                await db.notification.create({
                    data: {
                        user: { connect: { email: effectiveEmail.toLowerCase().trim() } },
                        type: type || "SYSTEM",
                        message: message,
                        link: link || null,
                        read: false
                    }
                });
            } catch (e) {
                console.warn("Prisma notification creation failed (might be a non-existing user):", e);
            }
        }

        // 2. Sync to Django Backend
        const { data, status } = await safeFetch(`${BACKEND_URL}${API_PREFIX}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (data === null) {
            return NextResponse.json({ ok: false, error: "Backend unavailable" }, { status: 200 });
        }

        // Broadcast to trigger frontend sync
        if (effectiveEmail) {
            broadcast({ type: "notification", user_email: effectiveEmail });
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

    // 1. Sync to Prisma
    if (mark_all && user_email) {
        try {
            await db.notification.updateMany({
                where: { user: { email: user_email.toLowerCase().trim() } },
                data: { read: true }
            });
        } catch (e) { console.error("Prisma mark_all error:", e); }
    } else if (notification_id) {
        try {
            // Check if it's a UUID (Prisma ID) or a string ID from backend
            if (notification_id.length > 20) { // Likely a Prisma UUID
                await db.notification.update({
                    where: { id: notification_id },
                    data: { read: true }
                });
            }
        } catch (e) { /* ignore - might be backend ID */ }
    }

    // 2. Sync to Django Backend
    let url: string;
    if (mark_all && user_email) {
        url = `${BACKEND_URL}${API_PREFIX}/mark-all-read?user_email=${encodeURIComponent(user_email)}`;
    } else if (notification_id && notification_id.length < 20) { // Only sync simple IDs to backend
        url = `${BACKEND_URL}${API_PREFIX}/${notification_id}/read`;
    } else {
        return NextResponse.json({ ok: true }); // Already handled Prisma
    }

    const { data } = await safeFetch(url, { method: "PATCH" });
    if (data === null) {
        return NextResponse.json({ ok: false }, { status: 200 });
    }

    // Broadcast update
    if (user_email) {
        broadcast({ type: "notification", user_email: user_email });
    }

    return NextResponse.json(data);
}
