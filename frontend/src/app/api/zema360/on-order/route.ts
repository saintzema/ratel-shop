import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { triggerZema360 } from "@/lib/zema-trigger";

export const dynamic = "force-dynamic";

// ── Auth guard ──────────────────────────────────────────────────────────────
// Shared service token (same one process-order uses). Open in dev when unset.
function isAuthorized(req: NextRequest) {
    const token = process.env.ZEMA_SERVICE_TOKEN;
    if (!token) return true;
    return req.headers.get("authorization") === `Bearer ${token}`;
}

/**
 * Single entry point to kick off the ZEMA 360 pipeline for an order, from ANY
 * source — web checkout, WhatsApp orders, admin-created orders, or an external
 * system. Decouples "an order exists" from "start the UiPath BPMN", so every
 * channel triggers the same automation.
 *
 * POST /api/zema360/on-order
 *   Headers: Authorization: Bearer <ZEMA_SERVICE_TOKEN>
 *   Body:    { "orderId": "ORDER-..." }
 *
 * Returns 202 immediately; the UiPath trigger runs after the response (never
 * blocks the caller, never throws).
 */
export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { orderId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const orderId = (body.orderId || "").trim();
    if (!orderId) {
        return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // Fire the BPMN after the response — non-blocking, resilient.
    after(() => triggerZema360(orderId));

    return NextResponse.json({ ok: true, accepted: true, orderId }, { status: 202 });
}
