import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/gigs/:id/proposals — a seller bids on an open gig. Requires a
// seller account (not just a signed-in user) — bidding is an expert action,
// the same way only sellers can send a Quote.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to submit a proposal" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    const proposedPrice = Number(body.proposedPrice);
    const deliveryDays = body.deliveryDays ? Number(body.deliveryDays) : null;

    if (!message || message.length < 5) {
        return NextResponse.json({ error: "Tell them briefly how you'd approach this" }, { status: 400 });
    }
    if (!Number.isFinite(proposedPrice) || proposedPrice <= 0) {
        return NextResponse.json({ error: "Enter your price" }, { status: 400 });
    }

    const seller = await db.seller.findFirst({ where: { userId: user.userId }, select: { id: true, businessName: true } });
    if (!seller) return NextResponse.json({ error: "You need a seller/expert account to bid on gigs" }, { status: 403 });

    const gig = await db.gigRequest.findUnique({ where: { id }, select: { id: true, status: true, posterUserId: true, title: true } });
    if (!gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    if (gig.status !== "open") return NextResponse.json({ error: "This gig is no longer accepting proposals" }, { status: 403 });

    try {
        const proposal = await db.gigProposal.upsert({
            where: { gigRequestId_sellerId: { gigRequestId: id, sellerId: seller.id } },
            update: { message, proposedPrice, deliveryDays, status: "pending" },
            create: { gigRequestId: id, sellerId: seller.id, message, proposedPrice, deliveryDays },
        });

        if (gig.posterUserId) {
            await db.notification.create({
                data: {
                    userId: gig.posterUserId,
                    type: "system",
                    message: `📩 ${seller.businessName} sent a proposal on "${gig.title}" — ₦${proposedPrice.toLocaleString()}.`,
                    link: `/hire/${id}`,
                },
            }).catch(() => {});
        }

        return NextResponse.json({ success: true, proposal });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Could not submit proposal" }, { status: 500 });
    }
}
