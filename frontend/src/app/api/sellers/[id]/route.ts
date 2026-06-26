import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Admin pages often pass the USER id, not the seller id — resolve by either.
        const seller = await db.seller.findFirst({
            where: { OR: [{ id }, { userId: id }] },
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
            orders: seller.orders.map((o: any) => ({
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

        // Build the update payload — handles both admin fields and seller self-service fields
        const sellerData: Record<string, any> = {};

        // Admin-controlled fields
        if (body.status !== undefined)                         sellerData.status = body.status;
        if (body.verified !== undefined)                       sellerData.verified = body.verified;
        if (body.kyc_status || body.kycStatus)                 sellerData.kycStatus = body.kyc_status || body.kycStatus;
        if (body.autoPayoutEnabled !== undefined)              sellerData.autoPayoutEnabled = body.autoPayoutEnabled;

        // Seller self-service profile fields
        if (body.businessName || body.business_name)           sellerData.businessName = body.businessName || body.business_name;
        if (body.description !== undefined)                    sellerData.description = body.description;
        if (body.logo_url !== undefined)                       sellerData.logoUrl = body.logo_url;
        if (body.logoUrl !== undefined)                        sellerData.logoUrl = body.logoUrl;
        if (body.cover_image_url !== undefined)                sellerData.coverImageUrl = body.cover_image_url;
        if (body.coverImageUrl !== undefined)                  sellerData.coverImageUrl = body.coverImageUrl;
        if (body.store_url !== undefined)                      sellerData.storeUrl = body.store_url || null;
        if (body.storeUrl !== undefined)                       sellerData.storeUrl = body.storeUrl || null;
        if (body.location !== undefined)                       sellerData.location = body.location;
        if (body.weekly_orders !== undefined)                  sellerData.weeklyOrders = body.weekly_orders;
        if (body.weeklyOrders !== undefined)                   sellerData.weeklyOrders = body.weeklyOrders;
        if (body.staff_count !== undefined)                    sellerData.staffCount = body.staff_count;
        if (body.staffCount !== undefined)                     sellerData.staffCount = body.staffCount;
        if (body.physical_stores !== undefined)                sellerData.physicalStores = body.physical_stores;
        if (body.physicalStores !== undefined)                 sellerData.physicalStores = body.physicalStores;
        if (Array.isArray(body.currencies))                    sellerData.currencies = body.currencies;
        if (body.whatsapp_number !== undefined)                sellerData.whatsappNumber = body.whatsapp_number;
        if (body.whatsappNumber !== undefined)                 sellerData.whatsappNumber = body.whatsappNumber;
        if (body.whatsapp_enabled !== undefined)               sellerData.whatsappEnabled = body.whatsapp_enabled;
        if (body.whatsappEnabled !== undefined)                sellerData.whatsappEnabled = body.whatsappEnabled;

        // User-linked fields (name, email)
        const userUpdate: Record<string, any> = {};
        if (body.name || body.display_name)         userUpdate.name = body.name || body.display_name;
        if (body.email || body.owner_email)         userUpdate.email = body.email || body.owner_email;
        // Only promote to "seller" if the user isn't already an admin — never downgrade an admin.
        if (body.status === "active") {
            const existingSeller = await db.seller.findFirst({ where: { OR: [{ id }, { userId: id }] }, select: { user: { select: { role: true } } } });
            if (existingSeller?.user?.role !== "admin") userUpdate.role = "seller";
        }

        // Admin pages may pass the USER id rather than the seller id — resolve either.
        const target = await db.seller.findFirst({
            where: { OR: [{ id }, { userId: id }] },
            select: { id: true, userId: true },
        });
        if (!target) {
            return NextResponse.json({ error: "Seller not found" }, { status: 404 });
        }

        const seller = await db.seller.update({
            where: { id: target.id },
            data: {
                ...sellerData,
                ...(Object.keys(userUpdate).length > 0 ? { user: { update: userUpdate } } : {})
            }
        });

        // Whenever the seller is approved/active, make sure their products go live.
        // Products uploaded while the account was still pending were saved with
        // isActive:false; flip them now. Match every id products may have been
        // stored under (seller id, user id, or the route param) so none are orphaned.
        const isApproved = body.status === "active" || body.verified === true
            || body.kyc_status === "approved" || body.kycStatus === "approved";
        if (isApproved) {
            const sellerIds = Array.from(new Set([target.id, target.userId, id].filter(Boolean))) as string[];
            await db.product.updateMany({
                where: { sellerId: { in: sellerIds } },
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
