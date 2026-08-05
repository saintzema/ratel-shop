import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { getUserFromRequest } from "@/lib/jwt";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Deleting a discount had no auth check at all — any caller who knew a
        // discount id could remove it.
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const existing = await (db as any).discount.findUnique({ where: { id }, select: { sellerId: true } });
        if (!existing) {
            return NextResponse.json({ error: "Discount not found" }, { status: 404 });
        }
        if (user.role !== "admin" && user.staffOf !== existing.sellerId) {
            const owningSeller = await db.seller.findUnique({ where: { id: existing.sellerId }, select: { userId: true } });
            if (!owningSeller || owningSeller.userId !== user.userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const discount = await (db as any).discount.delete({
            where: { id },
        });

        broadcast({ type: "discount_updated", sellerId: discount.sellerId });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
    }
}
