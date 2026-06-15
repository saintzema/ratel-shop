import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/seller/instagram/deauthorize
 * Required by Meta App Review. Called when a user deauthorizes the app from Instagram.
 * Clears stored IG tokens for the affected user.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = body?.user_id || body?.signed_request;
        if (userId) {
            await db.seller.updateMany({
                where: { instagramUserId: String(userId) } as any,
                data: {
                    instagramAccessToken: null,
                    instagramUserId: null,
                    instagramUsername: null,
                    instagramTokenExpiry: null,
                } as any,
            });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("[IG Deauth]", e);
        return NextResponse.json({ success: true }); // always 200 to Meta
    }
}
