import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || "fairprice_ig_webhook_2024";

/**
 * GET — Meta sends this to verify the webhook endpoint.
 * Returns hub.challenge when the verify_token matches.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode      = searchParams.get("hub.mode");
    const token     = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST — Receives real-time Instagram events.
 * Not required for catalog import — acknowledged with 200.
 */
export async function POST(req: NextRequest) {
    try { const body = await req.json(); console.log("[IG Webhook]", JSON.stringify(body).slice(0, 200)); } catch { }
    return new NextResponse("OK", { status: 200 });
}
