import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/seller/instagram/data-deletion
 * Required by Meta App Review. Called when a user requests data deletion.
 * Returns a confirmation URL and code as required by Meta's spec.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = body?.user_id || body?.signed_request;
        const confirmationCode = `fp_ig_del_${Date.now()}`;

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

        // Meta requires this specific response shape
        return NextResponse.json({
            url: `https://www.fairprice.ng/data-deletion?code=${confirmationCode}`,
            confirmation_code: confirmationCode,
        });
    } catch (e) {
        console.error("[IG Data Deletion]", e);
        return NextResponse.json({ url: "https://www.fairprice.ng/data-deletion", confirmation_code: "error" });
    }
}
