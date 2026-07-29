import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ownedStaffRecord(id: string, userId: string, email?: string) {
    const seller = await db.seller.findFirst({ where: { OR: [{ userId }, ...(email ? [{ ownerEmail: email }] : [])] } });
    if (!seller) return null;
    const staff = await db.sellerStaff.findUnique({ where: { id } });
    if (!staff || staff.sellerId !== seller.id) return null;
    return staff;
}

// PATCH /api/seller/staff/:id — update a teammate's permissions.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const staff = await ownedStaffRecord(id, user.userId, user.email);
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    for (const key of ["canEditPrice", "canEditStock", "canManageDiscounts", "canViewFinancials"] as const) {
        if (body[key] !== undefined) data[key] = !!body[key];
    }
    const updated = await db.sellerStaff.update({ where: { id }, data });
    return NextResponse.json({ staff: updated });
}

// DELETE /api/seller/staff/:id — revoke a teammate's access.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const staff = await ownedStaffRecord(id, user.userId, user.email);
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.sellerStaff.update({ where: { id }, data: { status: "revoked" } });
    return NextResponse.json({ success: true });
}
