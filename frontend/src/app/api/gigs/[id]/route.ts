import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/gigs/:id — PUBLIC gig detail. Proposals are only included for the
// gig's own poster (identified by their JWT matching posterUserId) — a
// competing seller shouldn't see who else bid or for how much.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = getUserFromRequest(req);

    const gig = await db.gigRequest.findUnique({ where: { id } });
    if (!gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });

    const isOwner = !!user && gig.posterUserId === user.userId;
    let proposals: any[] = [];
    if (isOwner) {
        const rows = await db.gigProposal.findMany({
            where: { gigRequestId: id },
            orderBy: { createdAt: "desc" },
            include: { seller: { select: { id: true, businessName: true, logoUrl: true, rating: true, verified: true, storeUrl: true } } },
        });
        proposals = rows.map(p => ({
            id: p.id,
            message: p.message,
            proposedPrice: p.proposedPrice,
            deliveryDays: p.deliveryDays,
            status: p.status,
            createdAt: p.createdAt,
            seller: p.seller,
        }));
    }

    // A signed-in seller viewing the gig gets told whether they already bid,
    // so the UI can show "Edit your proposal" instead of a duplicate form.
    let myProposal: any = null;
    if (user && !isOwner) {
        const seller = await db.seller.findFirst({ where: { userId: user.userId }, select: { id: true } });
        if (seller) {
            myProposal = await db.gigProposal.findUnique({
                where: { gigRequestId_sellerId: { gigRequestId: id, sellerId: seller.id } },
                select: { id: true, proposedPrice: true, message: true, deliveryDays: true, status: true },
            });
        }
    }

    return NextResponse.json({
        gig: {
            id: gig.id,
            title: gig.title,
            description: gig.description,
            category: gig.category,
            budgetMin: gig.budgetMin,
            budgetMax: gig.budgetMax,
            budgetType: gig.budgetType,
            deadline: gig.deadline,
            locationState: gig.locationState,
            locationCity: gig.locationCity,
            status: gig.status,
            isSponsored: gig.isSponsored,
            createdAt: gig.createdAt,
            isOwner,
            proposals,
            myProposal,
        },
    });
}
