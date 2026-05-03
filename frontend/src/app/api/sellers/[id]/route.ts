import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const seller = await db.seller.findUnique({
            where: { id },
            include: {
                user: true,
                orders: {
                    orderBy: { createdAt: "desc" },
                    take: 50
                }
            }
        });

        if (!seller) {
            return NextResponse.json({ error: "Seller not found" }, { status: 404 });
        }

        // Map to format expected by frontend
        const result = {
            ...seller,
            ...seller.user,
            id: seller.id, // Ensure seller ID is used
            role: "seller",
            created_at: seller.createdAt.toISOString(),
            business_name: seller.businessName,
            status: seller.status,
            orders: seller.orders.map(o => ({
                ...o,
                created_at: o.createdAt.toISOString(),
            }))
        };

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch seller" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { status, verified, kyc_status, kycStatus } = body;

        const seller = await db.seller.update({
            where: { id },
            data: {
                status: body.status || undefined,
                verified: body.verified !== undefined ? body.verified : undefined,
                kycStatus: body.kyc_status || body.kycStatus || undefined,
                businessName: body.businessName || body.business_name || undefined,
                user: {
                    update: {
                        name: body.name || body.display_name || undefined,
                        email: body.email || body.owner_email || undefined,
                        role: body.status === "active" ? "seller" : undefined
                    }
                }
            }
        });

        // If active, ensure products are active
        if (status === "active") {
            await db.product.updateMany({
                where: { sellerId: id },
                data: { isActive: true }
            });
        }

        broadcast({ type: "seller_updated", id: seller.id });
        broadcast({ type: "products_updated", seller_id: seller.id });

        return NextResponse.json(seller);
    } catch (error: any) {
        console.error("Seller update error:", error);
        return NextResponse.json({ error: error.message || "Failed to update seller" }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        if (body.action === "delete") {
            // Use the common user delete logic if possible, or direct delete
            // Since we are in the seller [id] route, we delete the seller and potentially the user
            const seller = await db.seller.findUnique({ where: { id }, include: { user: true } });
            if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

            if (seller.user) {
                await db.user.delete({ where: { id: seller.user.id } });
            } else {
                await db.seller.delete({ where: { id } });
            }

            broadcast({ type: "seller_deleted", id });
            return NextResponse.json({ success: true, message: "Seller deleted via POST fallback" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Operation failed" }, { status: 500 });
    }
}
