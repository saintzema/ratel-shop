import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { sendAdminAlert } from "@/lib/admin-alert";

export const dynamic = "force-dynamic";

/**
 * POST /api/expert-requests — "Hire an Expert" fallback for the early days
 * when there simply aren't enough registered service providers yet in a
 * given state/category. Rather than a dead end, it hands the request
 * straight to the FairPrice team (in-app admin alert + email) to manually
 * source and fulfill while the marketplace side of /services fills out.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { category, description, state, city, contactPhone } = body || {};

    if (!description || String(description).trim().length < 5) {
        return NextResponse.json({ error: "Describe what kind of expert you need" }, { status: 400 });
    }
    if (!state) {
        return NextResponse.json({ error: "Select your location" }, { status: 400 });
    }

    let requester: { name: string; email: string | null; whatsappNumber: string | null } | null = null;
    if (user) {
        const u = await db.user.findUnique({ where: { id: user.userId }, select: { name: true, email: true, whatsappNumber: true } });
        if (u) requester = u;
    }

    await sendAdminAlert({
        title: "New \"Hire an Expert\" request",
        message: `${requester?.name || "A visitor"} needs help finding: ${category || "an expert"} in ${city ? `${city}, ` : ""}${state}.`,
        data: {
            category: category || "Not specified",
            description: String(description),
            location: `${city ? `${city}, ` : ""}${state}`,
            requester_name: requester?.name || "Not signed in",
            requester_email: requester?.email || "n/a",
            requester_phone: contactPhone || requester?.whatsappNumber || "n/a",
        },
        link: "/services",
    });

    return NextResponse.json({ success: true });
}
