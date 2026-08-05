import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { resolveStoreUrl } from "@/lib/seller-utils";
import { getUserFromRequest } from "@/lib/jwt";

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

        // This endpoint is called from PUBLIC pages (product PDP, QR checkout landing)
        // to fetch a seller's display info (logo, name) — it must never leak the
        // seller's bank account, hashed password, orders (other buyers' data), or
        // owner contact info to an unauthenticated visitor. Only the admin or the
        // seller's own owner gets the full record.
        const requester = getUserFromRequest(req);
        const isAuthorized = !!requester && (requester.role === "admin" || requester.userId === seller.userId);

        const publicResult = {
            id: seller.id,
            role: "seller",
            created_at: seller.createdAt.toISOString(),
            business_name: seller.businessName,
            description: seller.description,
            logo_url: seller.logoUrl,
            logoUrl: seller.logoUrl,
            cover_image_url: seller.coverImageUrl,
            category: seller.category,
            verified: seller.verified,
            rating: seller.rating,
            trust_score: seller.trustScore,
            status: seller.status,
            store_url: seller.storeUrl,
            location: seller.location,
            owner_name: seller.ownerName,
            subscription_plan: seller.subscriptionPlan,
        };

        if (!isAuthorized) {
            return NextResponse.json(publicResult);
        }

        const result = {
            ...seller,
            ...seller.user,
            ...publicResult,
            user_id: seller.userId,
            kyc_status: seller.kycStatus,
            plan_expiry_date: seller.planExpiryDate ? seller.planExpiryDate.toISOString() : null,
            orders: seller.orders.map((o: any) => ({
                ...o,
                created_at: o.createdAt.toISOString(),
            }))
        };
        delete (result as any).password;

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

        // This used to accept status/verified/kycStatus/autoPayoutEnabled — and every
        // profile field — from any caller who knew a seller id, no auth check at all.
        // Resolve the target first so we can check both "does this caller own this
        // seller" and "is this caller allowed to touch admin-only fields."
        const authTarget = await db.seller.findFirst({
            where: { OR: [{ id }, { userId: id }] },
            select: { id: true, userId: true, ownerEmail: true },
        });
        if (!authTarget) {
            return NextResponse.json({ error: "Seller not found" }, { status: 404 });
        }
        const requester = getUserFromRequest(req);
        const isAdmin = requester?.role === "admin";
        const isOwner = !!requester && (
            requester.userId === authTarget.userId ||
            requester.staffOf === authTarget.id ||
            (!!requester.email && requester.email === authTarget.ownerEmail)
        );
        if (!requester || (!isAdmin && !isOwner)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Build the update payload — handles both admin fields and seller self-service fields
        const sellerData: Record<string, any> = {};

        // Admin-controlled fields — a seller (even the owner) must never be able to
        // self-approve/self-verify/flip their own status via this same endpoint.
        if (isAdmin) {
            if (body.status !== undefined)                     sellerData.status = body.status;
            if (body.verified !== undefined)                   sellerData.verified = body.verified;
            if (body.kyc_status || body.kycStatus)              sellerData.kycStatus = body.kyc_status || body.kycStatus;
        }
        // autoPayoutEnabled is a genuine seller self-service toggle (seller/settings/
        // payouts) — the owner may set it on their own account, not just an admin.
        if (body.autoPayoutEnabled !== undefined)              sellerData.autoPayoutEnabled = body.autoPayoutEnabled;

        // Seller self-service profile fields
        if (body.businessName || body.business_name)           sellerData.businessName = body.businessName || body.business_name;
        if (body.description !== undefined)                    sellerData.description = body.description;
        if (body.logo_url !== undefined)                       sellerData.logoUrl = body.logo_url;
        if (body.logoUrl !== undefined)                        sellerData.logoUrl = body.logoUrl;
        if (body.cover_image_url !== undefined)                sellerData.coverImageUrl = body.cover_image_url;
        if (body.coverImageUrl !== undefined)                  sellerData.coverImageUrl = body.coverImageUrl;
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
        if (body.phone_number !== undefined)                   sellerData.phoneNumber = body.phone_number;
        if (body.phoneNumber !== undefined)                    sellerData.phoneNumber = body.phoneNumber;
        if (body.id_document_url !== undefined)                sellerData.idDocumentUrl = body.id_document_url;
        if (body.cac_document_url !== undefined)               sellerData.cacDocumentUrl = body.cac_document_url;
        if (body.cac_rc_number !== undefined)                  sellerData.cacRcNumber = body.cac_rc_number;
        if (body.business_registered !== undefined)            sellerData.businessRegistered = body.business_registered;

        // User-linked fields (name, email)
        const userUpdate: Record<string, any> = {};
        if (body.name || body.display_name)         userUpdate.name = body.name || body.display_name;
        if (body.email || body.owner_email)         userUpdate.email = body.email || body.owner_email;
        // Only promote to "seller" if the user isn't already an admin — never downgrade an admin.
        // Gated by isAdmin: a non-admin caller must never trigger this via a raw body field
        // even though sellerData.status itself was already stripped for them above.
        if (isAdmin && body.status === "active") {
            const existingSeller = await db.seller.findFirst({ where: { OR: [{ id }, { userId: id }] }, select: { user: { select: { role: true } } } });
            if (existingSeller?.user?.role !== "admin") userUpdate.role = "seller";
        }

        // Admin pages may pass the USER id rather than the seller id — resolve either.
        const target = await db.seller.findFirst({
            where: { OR: [{ id }, { userId: id }] },
            select: { id: true, userId: true, storeUrl: true, businessName: true },
        });
        if (!target) {
            return NextResponse.json({ error: "Seller not found" }, { status: 404 });
        }

        // Guarantee storeUrl is never left empty — whether the seller explicitly edited
        // it or it was simply never set (the "gibberish /store/s_xxx link" bug).
        const requestedStoreUrl = body.store_url !== undefined ? body.store_url : body.storeUrl;
        if (requestedStoreUrl !== undefined || !target.storeUrl) {
            sellerData.storeUrl = await resolveStoreUrl(
                requestedStoreUrl || target.storeUrl,
                sellerData.businessName || target.businessName,
                target.id
            );
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
        const isApproved = isAdmin && (body.status === "active" || body.verified === true
            || body.kyc_status === "approved" || body.kycStatus === "approved");
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

            // Account deletion is destructive and irreversible — admin only. A seller
            // deleting their own account should go through a dedicated, more careful
            // flow (which doesn't exist yet), not this bare id-based delete.
            const requester = getUserFromRequest(req);
            if (!requester || requester.role !== "admin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

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
