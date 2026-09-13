import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { sendAdminAlert } from "@/lib/admin-alert";

export const dynamic = "force-dynamic";

// GET /api/gigs — PUBLIC browse feed for sellers/experts looking for work.
// Only ever returns "open" gigs — a gig that's in_progress/completed/cancelled
// shouldn't keep collecting proposals.
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const state = searchParams.get("state");
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 60);

    const gigs = await db.gigRequest.findMany({
        where: {
            status: "open",
            ...(category && category !== "All" ? { category } : {}),
            ...(state ? { locationState: state } : {}),
        },
        orderBy: [{ isSponsored: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: { _count: { select: { proposals: true } } },
    });

    return NextResponse.json({
        gigs: gigs.map(g => ({
            id: g.id,
            title: g.title,
            description: g.description,
            category: g.category,
            budgetMin: g.budgetMin,
            budgetMax: g.budgetMax,
            budgetType: g.budgetType,
            deadline: g.deadline,
            locationState: g.locationState,
            locationCity: g.locationCity,
            isSponsored: g.isSponsored,
            proposalCount: g._count.proposals,
            createdAt: g.createdAt,
        })),
    }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}

// POST /api/gigs — "I need something done" from either side of the platform:
// a signed-in buyer, or a guest with just a name + contact. This is the
// persisted, browsable replacement for the old /api/expert-requests, which
// only ever fired an admin alert and stored nothing a seller could act on.
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { title, description, category, budgetMin, budgetMax, budgetType, deadline, state, city, posterName, posterEmail, posterPhone } = body || {};

    if (!title || String(title).trim().length < 3) {
        return NextResponse.json({ error: "Give your gig a short title" }, { status: 400 });
    }
    if (!description || String(description).trim().length < 10) {
        return NextResponse.json({ error: "Describe what you need done in a bit more detail" }, { status: 400 });
    }
    if (!category) {
        return NextResponse.json({ error: "Select a category" }, { status: 400 });
    }
    if (!state) {
        return NextResponse.json({ error: "Select your location" }, { status: 400 });
    }

    let requester: { name: string; email: string | null } | null = null;
    if (user) {
        const u = await db.user.findUnique({ where: { id: user.userId }, select: { name: true, email: true } });
        if (u) requester = u;
    }
    const finalName = requester?.name || posterName || "A FairPrice user";
    if (!requester && !posterEmail && !posterPhone) {
        return NextResponse.json({ error: "Leave an email or phone number so experts can reach you" }, { status: 400 });
    }

    const gig = await db.gigRequest.create({
        data: {
            posterUserId: user?.userId || null,
            posterName: finalName,
            posterEmail: requester?.email || posterEmail || null,
            posterPhone: posterPhone || null,
            title: String(title).trim(),
            description: String(description).trim(),
            category,
            budgetMin: budgetMin ? Number(budgetMin) : null,
            budgetMax: budgetMax ? Number(budgetMax) : null,
            budgetType: budgetType === "hourly" ? "hourly" : "fixed",
            deadline: deadline ? new Date(deadline) : null,
            locationState: state,
            locationCity: city || null,
        },
    });

    await sendAdminAlert({
        title: "New gig posted",
        message: `${finalName} posted a gig: "${gig.title}" (${category}) in ${city ? `${city}, ` : ""}${state}.`,
        data: {
            category,
            budget: budgetMin || budgetMax ? `₦${(budgetMin || 0).toLocaleString()} - ₦${(budgetMax || 0).toLocaleString()}` : "Not specified",
            location: `${city ? `${city}, ` : ""}${state}`,
        },
        link: "/hire",
    }).catch(() => {});

    return NextResponse.json({ success: true, gig });
}
