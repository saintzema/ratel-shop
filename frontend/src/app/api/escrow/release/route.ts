/**
 * POST /api/escrow/release
 *
 * Release escrowed funds for an order.  Called by the ZEMA Finance agent
 * after the buyer confirms receipt (or after the auto-release window).
 *
 * Auth: Bearer ZEMA_SERVICE_TOKEN  (set in env)
 *
 * Body: { orderId: string; releasedBy?: "buyer" | "agent" | "admin" }
 */
import { NextResponse } from "next/server";
import { EscrowService } from "@/lib/escrow-service";
import { requireZemaAuth } from "@/lib/zema-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const authError = requireZemaAuth(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const { orderId, releasedBy = "agent" } = body as {
            orderId?: string;
            releasedBy?: string;
        };

        if (!orderId) {
            return NextResponse.json({ error: "orderId is required" }, { status: 400 });
        }

        const result = await EscrowService.releaseFunds(orderId, releasedBy);

        return NextResponse.json({
            success: true,
            orderId,
            releasedBy,
            result,
        });
    } catch (err: any) {
        console.error("[escrow/release] error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Failed to release escrow" },
            { status: 500 }
        );
    }
}
