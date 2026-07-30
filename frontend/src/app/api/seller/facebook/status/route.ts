import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

/** GET /api/seller/facebook/status — lightweight connection check for the Composer. */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: { OR: [{ userId: user.userId }, ...(user.email ? [{ ownerEmail: user.email }] : [])] },
        select: { facebookPageId: true, facebookPageName: true },
    });

    return NextResponse.json({
        connected: !!seller?.facebookPageId,
        pageName: seller?.facebookPageName || null,
    });
}
