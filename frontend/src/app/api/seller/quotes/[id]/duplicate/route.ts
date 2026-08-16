import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

/**
 * POST /api/seller/quotes/:id/duplicate   { clientName?, clientContact? }
 *
 * Copies an existing quote into a fresh draft, optionally re-addressed to a
 * different client. Sellers quote the same job repeatedly (same solar install,
 * same parts list) and previously had to retype every line item, because the
 * only alternative — editing the original — would rewrite a quote the first
 * client had already been sent and possibly already paid against.
 *
 * Deliberately copies the WORK (title, items, notes, deposit terms) and resets
 * everything transactional: new id, status back to draft, nothing paid.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const source = await db.quote.findUnique({ where: { id } });
    if (!source) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    // Ownership: only the seller who owns the quote may copy it.
    const seller = await db.seller.findFirst({
        where: {
            id: source.sellerId,
            OR: [{ userId: user.userId }, ...(user.email ? [{ ownerEmail: user.email }] : [])],
        },
        select: { id: true },
    });
    if (!seller && user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const clientName = (body.clientName || "").trim();
    const clientContact = (body.clientContact || "").trim();

    const copy = await db.quote.create({
        data: {
            sellerId: source.sellerId,
            title: source.title,
            clientName: clientName || `${source.clientName} (copy)`,
            clientContact: clientContact || null,
            items: source.items as any,
            subtotal: source.subtotal,
            total: source.total,
            depositRequired: source.depositRequired,
            depositAmount: source.depositAmount,
            notes: source.notes,
            currency: source.currency,
            // Reset the money side — this is a new quote to a new client.
            amountPaid: 0,
            status: "draft",
        },
    });

    return NextResponse.json({ quote: copy });
}
