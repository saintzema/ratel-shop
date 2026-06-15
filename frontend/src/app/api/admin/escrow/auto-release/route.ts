import { NextResponse } from "next/server";
import { EscrowService } from "@/lib/escrow-service";
import { getUserFromRequest } from "@/lib/jwt";

/**
 * API Route for triggering the Escrow Auto-Release worker.
 * Can be called by a cron job or manually by an admin.
 */
export async function POST(request: Request) {
    try {
        // Simple security check: either an admin is calling it, or it's a cron secret
        const authHeader = request.headers.get("Authorization");
        const cronSecret = process.env.CRON_SECRET;
        
        const isCronTrigger = cronSecret && authHeader === `Bearer ${cronSecret}`;
        
        if (!isCronTrigger) {
            const user = getUserFromRequest(request);
            if (!user || user.role !== "admin") {
                return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        const results = await EscrowService.processAutoReleases();

        return NextResponse.json({
            success: true,
            message: `Processed ${results.processed} orders. ${results.failed} failures.`,
            details: results
        });

    } catch (error: any) {
        console.error("Auto-Release API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// Support GET for simple testing if needed (protected by admin check)
export async function GET(request: Request) {
    const user = getUserFromRequest(request);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const results = await EscrowService.processAutoReleases();
    return NextResponse.json({
        success: true,
        message: "Scan complete",
        results
    });
}
