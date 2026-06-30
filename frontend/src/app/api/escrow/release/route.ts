import { NextRequest, NextResponse } from "next/server";
import { EscrowService } from "@/lib/escrow-service";
import { notifyAdmins } from "@/lib/admin-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/escrow/release
 *
 * Releases a single order's escrow → marks it payoutable, creates the payout record, and
 * notifies the seller, buyer, and admins. This is the endpoint the ZEMA 360 HITL approval
 * calls (WhatsApp "approve RUN-xxxx" and the UiPath BPMN escrow_release step).
 *
 * It previously DID NOT EXIST — both callers fetched /api/escrow/release and silently 404'd,
 * so an approved HITL request never actually released funds. This closes that gap.
 *
 * Auth mirrors zema360/process-order: a ZEMA_SERVICE_TOKEN bearer (or CRON_SECRET). If no
 * service token is configured (local/dev) the endpoint is open, exactly like process-order.
 */
function isAuthorized(req: NextRequest): boolean {
    const svcToken = process.env.ZEMA_SERVICE_TOKEN;
    const cronSecret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    if (!svcToken && !cronSecret) return true; // no secret configured → dev/open
    if (svcToken && auth === `Bearer ${svcToken}`) return true;
    if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
    return false;
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { orderId?: string; releasedBy?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const { orderId, releasedBy } = body;
    if (!orderId) {
        return NextResponse.json({ success: false, error: "orderId is required" }, { status: 400 });
    }

    try {
        const order = await EscrowService.releaseFunds(orderId, releasedBy);
        const amount = (order as any)?.amount;

        // Admin visibility: escrow releases are a material financial event.
        await notifyAdmins(
            `🔓 Escrow released for order ${String(orderId).slice(-8).toUpperCase()}` +
            (amount ? ` — ₦${Number(amount).toLocaleString()} now payoutable` : "") +
            ` (by ${releasedBy || "system"}).`,
            { type: "order", link: "/admin/escrow" }
        );

        return NextResponse.json({ success: true, orderId, escrowStatus: "released" });
    } catch (err: any) {
        console.error("[escrow/release] error:", err);
        return NextResponse.json({ success: false, error: err?.message || "release_failed" }, { status: 500 });
    }
}
