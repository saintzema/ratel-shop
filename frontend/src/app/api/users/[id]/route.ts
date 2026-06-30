import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { getUserFromRequest } from "@/lib/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * PATCH /api/users/:id
 * Admin endpoint to suspend or reactivate a user account.
 * We toggle via the `isPremium` flag as a proxy until a proper `status`
 * column is added — but more importantly we update the linked Seller record
 * if one exists, since Seller.status is the authoritative field for sellers.
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { status } = await req.json(); // "active" | "suspended"

        if (!id || !status) {
            return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
        }

        // Update linked seller if one exists
        const user = await db.user.findUnique({
            where: { id },
            include: { sellers: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const safeSellerStatus = status === "suspended" ? "frozen" : status === "active" ? "active" : status;

        if (user.sellers && user.sellers.length > 0) {
            for (const seller of user.sellers) {
                await db.seller.update({
                    where: { id: seller.id },
                    data: { status: safeSellerStatus as any }
                });

                // When suspending, also deactivate their products
                await db.product.updateMany({
                    where: { sellerId: seller.id },
                    data: { isActive: status !== "suspended" }
                });

                broadcast({ type: "seller_updated", id: seller.id });
            }
        }

        broadcast({ type: "user_updated", id });
        return NextResponse.json({ success: true, id, status });
    } catch (error: any) {
        console.error("User PATCH error:", error);
        return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // Authorization: only an admin OR the account owner (self-delete) may hard-delete.
        // Previously this endpoint had NO auth — any caller could erase any account by id
        // (access-control failure). Self-delete powers the in-app "Delete my account" flow
        // required for App Store submission; admins delete via the admin users panel (cookie).
        const jwtUser = getUserFromRequest(req);
        const session = await getServerSession(authOptions);
        const callerId = (jwtUser as any)?.id || (session?.user as any)?.id;
        const callerRole = (jwtUser as any)?.role || (session?.user as any)?.role;
        const isAdmin = callerRole === "admin";
        const isSelf = !!callerId && callerId === id;
        if (!isAdmin && !isSelf) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log(`🗑️ Processing Hard Delete for ID: ${id} (by ${isAdmin ? "admin" : "self"})`);

        // 1. Try deleting from User table
        // This will cascade to linked Seller, Orders, Products, etc.
        const user = await db.user.findUnique({ 
            where: { id },
            include: { sellers: true } 
        });

        if (user) {
            const sellerIds = user.sellers.map(s => s.id);
            await db.user.delete({ where: { id } });
            
            broadcast({ type: "user_deleted", id });
            for (const sid of sellerIds) {
                broadcast({ type: "seller_deleted", id: sid });
            }
            
            console.log(`✅ User ${id} and all related data purged.`);
            return NextResponse.json({ success: true, message: "User deleted successfully" });
        }

        // 2. Fallback: Try Seller table (for seed sellers with no linked user)
        const seller = await db.seller.findUnique({ where: { id } });
        if (seller) {
            await db.seller.delete({ where: { id } });
            broadcast({ type: "seller_deleted", id });
            console.log(`✅ Seller ${id} purged.`);
            return NextResponse.json({ success: true, message: "Seller deleted successfully" });
        }

        return NextResponse.json({ error: "Account not found in Users or Sellers" }, { status: 404 });
    } catch (error: any) {
        console.error("❌ Hard delete failed:", error);
        return NextResponse.json({ 
            error: error.message || "Deletion failed due to database constraints",
            details: error
        }, { status: 500 });
    }
}
