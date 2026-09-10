import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/rides/[id]/rate  { rating: 1-5, comment? } — the RIDER rates a completed trip. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const body = await req.json().catch(() => ({}));
    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const { count } = await db.rideRequest.updateMany({
        where: { id: rideId, riderId: user.userId, status: "completed" },
        data: { rating, ratingComment: body?.comment ? String(body.comment).slice(0, 300) : null },
    });
    if (count === 0) {
        return NextResponse.json({ error: "This ride can't be rated (not yours, or not completed)" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
