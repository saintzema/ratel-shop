import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function resolveSeller(userId: string, email?: string) {
    return db.seller.findFirst({
        where: { OR: [{ userId }, ...(email ? [{ ownerEmail: email }] : [])] },
    });
}

async function ownedQuote(id: string, userId: string, email?: string) {
    const seller = await resolveSeller(userId, email);
    if (!seller) return null;
    const quote = await db.quote.findUnique({ where: { id } });
    if (!quote || quote.sellerId !== seller.id) return null;
    return quote;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const quote = await ownedQuote(id, user.userId, user.email);
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    return NextResponse.json({ quote });
}

// PATCH — edit line items/client info (only while still a draft) or update status (e.g. mark "sent").
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const quote = await ownedQuote(id, user.userId, user.email);
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const data: any = {};
    if (Array.isArray(body.items)) {
        const cleanItems = body.items.map((i: any) => ({
            description: String(i.description || "").slice(0, 300),
            qty: Math.max(1, Number(i.qty) || 1),
            unitPrice: Math.max(0, Number(i.unitPrice) || 0),
        }));
        data.items = cleanItems;
        data.subtotal = cleanItems.reduce((sum: number, i: any) => sum + i.qty * i.unitPrice, 0);
        data.total = data.subtotal;
    }
    if (body.title) data.title = String(body.title).slice(0, 200);
    if (body.clientName) data.clientName = String(body.clientName).slice(0, 200);
    if (body.clientContact !== undefined) data.clientContact = body.clientContact ? String(body.clientContact).slice(0, 200) : null;
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).slice(0, 500) : null;
    if (body.depositRequired !== undefined) data.depositRequired = !!body.depositRequired;
    if (body.depositAmount !== undefined) data.depositAmount = body.depositAmount != null ? Math.max(0, Number(body.depositAmount)) : null;
    if (body.status && ["draft", "sent", "cancelled"].includes(body.status)) data.status = body.status; // payment-driven statuses are set by the pay/verify route, not here

    const updated = await db.quote.update({ where: { id }, data });
    return NextResponse.json({ quote: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const quote = await ownedQuote(id, user.userId, user.email);
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    await db.quote.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
