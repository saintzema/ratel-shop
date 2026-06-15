import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export async function GET(req: NextRequest) {
    const admin = getUserFromRequest(req);
    if (!admin || (admin as any).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const txns = await (db as any).offlineTransaction.findMany({
            orderBy: { transactionDate: "desc" },
        });
        return NextResponse.json(txns);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const admin = getUserFromRequest(req);
    if (!admin || (admin as any).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = await req.json();
        const { amount, description, buyerName, paymentMethod, bankReference, evidenceNote, transactionDate } = body;

        if (!amount || !description || !buyerName || !transactionDate) {
            return NextResponse.json({ error: "amount, description, buyerName, transactionDate are required" }, { status: 400 });
        }

        const txn = await (db as any).offlineTransaction.create({
            data: {
                amount: parseFloat(amount),
                description,
                buyerName,
                paymentMethod: paymentMethod || "bank_transfer",
                bankReference: bankReference || null,
                evidenceNote: evidenceNote || null,
                transactionDate: new Date(transactionDate),
            },
        });
        return NextResponse.json(txn, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
