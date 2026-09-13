import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/gigs/:id/proposals/:proposalId — the gig's poster accepts or
// declines a bid. Accepting doesn't move any money itself: it creates a real
// Quote from the seller to the poster for the agreed price, so payment,
// escrow-style protection and the post-payment review prompt are all the
// exact same pipeline a seller-initiated Quote already uses — no separate
// payments path to build or trust.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; proposalId: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const { id, proposalId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action === "decline" ? "decline" : "accept";

    const gig = await db.gigRequest.findUnique({ where: { id } });
    if (!gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    if (gig.posterUserId !== user.userId) {
        return NextResponse.json({ error: "Only the person who posted this gig can respond to proposals" }, { status: 403 });
    }

    const proposal = await db.gigProposal.findUnique({ where: { id: proposalId }, include: { seller: { select: { id: true, businessName: true, userId: true } } } });
    if (!proposal || proposal.gigRequestId !== id) {
        return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (action === "decline") {
        const updated = await db.gigProposal.update({ where: { id: proposalId }, data: { status: "declined" } });
        await db.notification.create({
            data: { userId: proposal.seller.userId, type: "system", message: `Your proposal on "${gig.title}" was declined.`, link: `/seller/gigs` },
        }).catch(() => {});
        return NextResponse.json({ success: true, proposal: updated });
    }

    if (gig.status !== "open") {
        return NextResponse.json({ error: "This gig already has an accepted proposal" }, { status: 409 });
    }

    const quote = await db.$transaction(async (tx) => {
        const created = await tx.quote.create({
            data: {
                sellerId: proposal.seller.id,
                title: gig.title,
                clientName: gig.posterName,
                clientContact: gig.posterEmail || gig.posterPhone || undefined,
                items: [{ description: gig.title, qty: 1, unitPrice: proposal.proposedPrice }],
                subtotal: proposal.proposedPrice,
                total: proposal.proposedPrice,
                status: "sent",
            },
        });
        await tx.gigProposal.update({ where: { id: proposalId }, data: { status: "accepted" } });
        await tx.gigProposal.updateMany({ where: { gigRequestId: id, id: { not: proposalId }, status: "pending" }, data: { status: "declined" } });
        await tx.gigRequest.update({ where: { id }, data: { status: "in_progress", acceptedProposalId: proposalId } });
        return created;
    });

    await db.notification.create({
        data: { userId: proposal.seller.userId, type: "system", message: `🎉 Your proposal on "${gig.title}" was accepted! A quote has been sent for payment.`, link: `/seller/quotes/${quote.id}` },
    }).catch(() => {});

    return NextResponse.json({ success: true, quoteId: quote.id });
}
