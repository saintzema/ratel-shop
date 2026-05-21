import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

export async function GET(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const id = req.nextUrl.searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }

        const draft = await (prisma as any).financingApplication.findFirst({
            where: { id, userId: user.userId, status: 'draft' },
            include: { product: { select: { id: true, name: true, price: true, category: true } } },
        });

        if (!draft) {
            return NextResponse.json({ error: "Draft not found or already submitted" }, { status: 404 });
        }

        return NextResponse.json({
            draft,
            product: draft.product ?? { id: draft.productId, name: "Product", price: draft.loanAmount + draft.depositAmount, category: null },
        });
    } catch (err) {
        console.error('[financing/draft] error:', err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
