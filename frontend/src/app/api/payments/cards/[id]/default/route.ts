import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

// POST /api/payments/cards/:id/default — make this the buyer's default saved card.
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const card = await db.savedCard.findUnique({ where: { id } });
    if (!card || card.userId !== user.userId) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await db.$transaction([
        db.savedCard.updateMany({ where: { userId: user.userId, isDefault: true }, data: { isDefault: false } }),
        db.savedCard.update({ where: { id }, data: { isDefault: true } }),
    ]);

    return NextResponse.json({ success: true });
}
