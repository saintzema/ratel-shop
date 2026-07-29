import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/quotes/:id — PUBLIC, read-only. Powers the client-facing quote/
// invoice page (/quote/[id]) — no auth, since the client receiving the quote
// never has a FairPrice account. Only returns what a client needs to see.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const quote = await db.quote.findUnique({
        where: { id },
        include: { seller: { select: { businessName: true, logoUrl: true, whatsappNumber: true, phoneNumber: true } } },
    });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    return NextResponse.json({
        quote: {
            id: quote.id,
            title: quote.title,
            clientName: quote.clientName,
            items: quote.items,
            subtotal: quote.subtotal,
            total: quote.total,
            depositRequired: quote.depositRequired,
            depositAmount: quote.depositAmount,
            amountPaid: quote.amountPaid,
            status: quote.status,
            notes: quote.notes,
            currency: quote.currency,
            createdAt: quote.createdAt,
            seller: {
                businessName: quote.seller.businessName,
                logoUrl: quote.seller.logoUrl,
                contact: quote.seller.whatsappNumber || quote.seller.phoneNumber || null,
            },
        },
    });
}
