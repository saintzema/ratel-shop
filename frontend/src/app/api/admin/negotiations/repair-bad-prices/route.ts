import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

// One-off repair: negotiations whose proposedPrice/counterPrice got poisoned by the
// unguarded WhatsApp price parser (fixed in commit d174487b) — a stray phone number
// sent as a message could be parsed as a literal price, producing offers in the
// trillions. Any negotiation over this bound is corrupted data, not a real offer.
const MAX_REASONABLE_PRICE = 1_000_000_000;

export async function POST(req: Request) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const bad = await db.negotiationRequest.findMany({
        where: {
            OR: [
                { proposedPrice: { gt: MAX_REASONABLE_PRICE } },
                { counterPrice: { gt: MAX_REASONABLE_PRICE } },
            ],
        },
        include: { product: { select: { name: true, price: true } } },
    });

    const results: { id: string; productName: string; from: number; action: string }[] = [];

    for (const neg of bad) {
        const listedPrice = neg.product?.price || 0;
        const data: any = {};

        if (neg.proposedPrice > MAX_REASONABLE_PRICE) {
            data.proposedPrice = listedPrice ? Math.round(listedPrice * 0.9) : 0;
        }
        if ((neg as any).counterPrice && (neg as any).counterPrice > MAX_REASONABLE_PRICE) {
            data.counterPrice = null;
        }
        // A negotiation corrupted this way was never a real offer — close it out
        // rather than leave a fabricated price sitting in "pending".
        data.status = "rejected";

        await db.negotiationRequest.update({ where: { id: neg.id }, data });
        results.push({
            id: neg.id,
            productName: neg.product?.name || neg.productId,
            from: neg.proposedPrice,
            action: "reset & rejected",
        });
    }

    return NextResponse.json({ success: true, repaired: results.length, results });
}
