import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function resolveSeller(userId: string, email?: string) {
    return db.seller.findFirst({
        where: { OR: [{ userId }, ...(email ? [{ ownerEmail: email }] : [])] },
    });
}

// GET /api/seller/quotes — list the caller's own quotes.
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const quotes = await db.quote.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ quotes });
}

// POST /api/seller/quotes — create a new quote/invoice.
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { title, clientName, clientContact, items, depositRequired, depositAmount, notes } = body;
    if (!title || !clientName || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "title, clientName, and at least one line item are required" }, { status: 400 });
    }

    const cleanItems = items.map((i: any) => ({
        description: String(i.description || "").slice(0, 300),
        qty: Math.max(1, Number(i.qty) || 1),
        unitPrice: Math.max(0, Number(i.unitPrice) || 0),
    }));
    const subtotal = cleanItems.reduce((sum: number, i: any) => sum + i.qty * i.unitPrice, 0);

    const quote = await db.quote.create({
        data: {
            sellerId: seller.id,
            title: String(title).slice(0, 200),
            clientName: String(clientName).slice(0, 200),
            clientContact: clientContact ? String(clientContact).slice(0, 200) : null,
            items: cleanItems,
            subtotal,
            total: subtotal,
            depositRequired: !!depositRequired,
            depositAmount: depositRequired ? Math.max(0, Number(depositAmount) || 0) : null,
            notes: notes ? String(notes).slice(0, 500) : null,
        },
    });

    return NextResponse.json({ quote });
}
