import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { BaseTemplate } from "@/lib/email-templates";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY || 're_YxXYZ...');
const SITE = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function emailQuoteToClient(quote: any, sellerName: string) {
    if (!quote.clientContact || !EMAIL_RE.test(quote.clientContact)) return; // phone number, not an email — nothing to send to
    const link = `${SITE}/quote/${quote.id}`;
    const rows = (quote.items as any[])
        .map(i => `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.description} × ${i.qty}</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">NGN ${(i.qty * i.unitPrice).toLocaleString("en-NG")}</td>
        </tr>`).join("");
    const html = BaseTemplate(quote.title, `
        <h2 style="margin:0 0 4px;">${quote.title}</h2>
        <p style="color:#666;margin:0 0 20px;">A quote from ${sellerName} on FairPrice.ng</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
        <p style="text-align:right;font-weight:bold;font-size:16px;margin-top:16px;">Total: NGN ${quote.total.toLocaleString("en-NG")}</p>
        <a href="${link}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">View & Pay Quote</a>
    `);
    await resend.emails.send({
        from: `${sellerName} via FairPrice <hello@fairprice.ng>`,
        to: [quote.clientContact],
        subject: `Quote from ${sellerName}: ${quote.title}`,
        html,
    }).catch(err => console.error("Failed to send quote email:", err));
}

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

    // Fire-and-forget — a slow/failed email must never block the seller from
    // getting their quote created (they can still share the payable link
    // manually via WhatsApp/copy-link either way).
    emailQuoteToClient(quote, seller.businessName).catch(() => {});

    return NextResponse.json({ quote });
}
