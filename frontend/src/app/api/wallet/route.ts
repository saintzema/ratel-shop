import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { previewWallet, redeemCredits, MAX_CREDIT_SHARE } from "@/lib/credit-wallet";

export const dynamic = "force-dynamic";

/**
 * GET  /api/wallet?billTotal=N   — balance, and how much of this bill it covers.
 * POST /api/wallet  { billTotal, reference } — spend that credit.
 *
 * On `billTotal` being client-supplied: it decides how much of the user's OWN
 * credit they may spend on this purchase, never whether credit exists. The
 * security boundary is redeemCredits(), which can only ever consume rows
 * belonging to this user that are still active — so the worst a tampered
 * total achieves is spending their own balance faster than the share cap
 * intended. Nobody can mint credit, and nobody can touch anybody else's.
 *
 * The caller settles against `spent` in the response, not what it asked for:
 * a concurrent order or ride may have taken the same credits first.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const billTotal = Number(req.nextUrl.searchParams.get("billTotal") || 0);
    const wallet = await previewWallet(user.userId, billTotal);
    return NextResponse.json({ ...wallet, maxShare: MAX_CREDIT_SHARE });
}

export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const billTotal = Number(body?.billTotal || 0);
    const reference = String(body?.reference || "").trim();
    if (!(billTotal > 0)) return NextResponse.json({ error: "billTotal is required" }, { status: 400 });
    if (!reference) return NextResponse.json({ error: "reference is required" }, { status: 400 });

    const wallet = await previewWallet(user.userId, billTotal);
    if (wallet.applicable <= 0) return NextResponse.json({ success: true, spent: 0 });

    const spent = await redeemCredits(user.userId, wallet.applicable, reference);
    return NextResponse.json({ success: true, spent, remainingBalance: wallet.balance - spent });
}
