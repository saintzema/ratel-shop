import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../../realtime/route";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        console.log(`🗑️ Processing Hard Delete for ID: ${id}`);

        // 1. Try deleting from User table
        // This will cascade to linked Seller, Orders, Products, etc.
        const user = await db.user.findUnique({ 
            where: { id },
            include: { seller: true } 
        });

        if (user) {
            const sellerId = user.seller?.id;
            await db.user.delete({ where: { id } });
            
            broadcast({ type: "user_deleted", id });
            if (sellerId) {
                broadcast({ type: "seller_deleted", id: sellerId });
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
