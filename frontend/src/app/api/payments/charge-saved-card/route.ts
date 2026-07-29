import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { chargeSavedCard } from "@/lib/paystack-card";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/charge-saved-card  { cardId, amount, reason }
 *
 * Charges the caller's OWN saved card — a human explicitly paying with a
 * saved card at checkout, not an agent-initiated charge. Agent-initiated
 * charges (Ziva chat / WhatsApp) go through their own gated flow, not this
 * route directly, so they can't skip the extra confirmation step that
 * requires.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { cardId?: string; amount?: number; reason?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body.cardId || typeof body.amount !== "number" || body.amount <= 0) {
        return NextResponse.json({ error: "cardId and a positive amount are required" }, { status: 400 });
    }

    const result = await chargeSavedCard({
        savedCardId: body.cardId,
        userId: user.userId,
        amount: body.amount,
        reason: body.reason || "checkout",
        initiatedBy: `user:${user.userId}`,
    });

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, reference: result.reference });
}
