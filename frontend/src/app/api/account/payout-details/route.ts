import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET  /api/account/payout-details — the caller's own payout bank details (masked).
 * POST /api/account/payout-details { bankName, accountNumber, accountName } — save them.
 *
 * This is what lets delivery escrow release (see /api/deliveries/[id]/deliver)
 * transfer automatically instead of falling to the admin-reviewed queue.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const record = await db.user.findUnique({
        where: { id: user.userId },
        select: { payoutBankName: true, payoutAccountNumber: true, payoutAccountName: true },
    });
    return NextResponse.json({
        bankName: record?.payoutBankName || null,
        accountName: record?.payoutAccountName || null,
        accountNumberMasked: record?.payoutAccountNumber
            ? `${"*".repeat(Math.max(0, record.payoutAccountNumber.length - 4))}${record.payoutAccountNumber.slice(-4)}`
            : null,
    });
}

export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bankName = String(body?.bankName || "").trim();
    const accountNumber = String(body?.accountNumber || "").trim();
    const accountName = String(body?.accountName || "").trim();
    if (!bankName || accountNumber.length < 10 || !accountName) {
        return NextResponse.json({ error: "A resolved bank, account number, and account name are required" }, { status: 400 });
    }

    await db.user.update({
        where: { id: user.userId },
        data: { payoutBankName: bankName, payoutAccountNumber: accountNumber, payoutAccountName: accountName },
    });
    return NextResponse.json({ success: true });
}
