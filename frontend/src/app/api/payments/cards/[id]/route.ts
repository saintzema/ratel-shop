import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

// DELETE /api/payments/cards/:id — remove a saved card. Owner-only: a card
// belongs to exactly one user, so we check userId matches before deleting
// rather than trusting the id alone.
export async function DELETE(
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

    await db.savedCard.delete({ where: { id } });

    // If the deleted card was the default, promote the next-oldest remaining one.
    if (card.isDefault) {
        const next = await db.savedCard.findFirst({
            where: { userId: user.userId },
            orderBy: { createdAt: "desc" },
        });
        if (next) {
            await db.savedCard.update({ where: { id: next.id }, data: { isDefault: true } });
        }
    }

    return NextResponse.json({ success: true });
}
