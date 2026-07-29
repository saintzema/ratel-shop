import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

// GET /api/payments/cards — list the caller's own saved cards.
// authorizationCode is deliberately never included in the response — it's the
// one value capable of charging the card again, so it never leaves the server.
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cards = await db.savedCard.findMany({
        where: { userId: user.userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
            id: true, last4: true, expMonth: true, expYear: true,
            cardType: true, bank: true, isDefault: true, createdAt: true,
        },
    });

    return NextResponse.json({ cards });
}
