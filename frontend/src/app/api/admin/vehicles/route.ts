import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * GET   /api/admin/vehicles?status=pending  — the inspection queue.
 * PATCH /api/admin/vehicles  { id, status, rejectionReason? }  — approve/reject.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const vehicles = await db.vehicle.findMany({
        where: status ? { status: status as any } : {},
        include: { driver: { select: { id: true, name: true, email: true, whatsappNumber: true } } },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ vehicles });
}

export async function PATCH(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { id, status, rejectionReason } = body || {};
    if (!id || !["approved", "rejected"].includes(String(status))) {
        return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
    }

    const vehicle = await db.vehicle.update({
        where: { id },
        data: { status, rejectionReason: status === "rejected" ? (rejectionReason || "Did not pass inspection") : null },
    });

    await notifyUser(vehicle.driverId,
        status === "approved"
            ? `🚗 Your ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}) passed inspection — you can start accepting rides.`
            : `Your vehicle submission for ${vehicle.make} ${vehicle.model} was not approved: ${vehicle.rejectionReason}`
    ).catch(() => {});

    return NextResponse.json({ success: true, vehicle });
}
