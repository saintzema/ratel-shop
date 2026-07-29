import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

// GET /api/admin/quotes — admin oversight across every seller's quotes/invoices.
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const quotes = await db.quote.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { seller: { select: { businessName: true, id: true } } },
    });

    return NextResponse.json({ quotes });
}
