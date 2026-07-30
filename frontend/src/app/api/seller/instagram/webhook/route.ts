import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifySeller } from "@/lib/seller-notify";
import { fireworksJSON, isFireworksEnabled } from "@/lib/fireworks";

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

// Fast keyword pass — catches the large majority of real purchase-intent comments
// without an AI call (webhooks need to ack quickly, and most "how much/is this
// available" comments don't need a model to recognise). Only genuinely ambiguous
// text falls through to the AI classifier below.
const INTENT_KEYWORDS = /\b(how much|price|cost|available|avail|order|buy|purchase|dm|dm me|send price|link|delivery|deliver|instock|in stock|still have|still available)\b/i;

// Obvious non-intent — pure emoji/short reactions shouldn't even hit the keyword
// check meaningfully, but this guards against e.g. "🔥🔥🔥 buy" edge cases where
// the whole comment is just noise around one matched word.
const MIN_MEANINGFUL_LENGTH = 3;

async function classifyIntent(text: string): Promise<boolean> {
    const clean = text.trim();
    if (clean.length < MIN_MEANINGFUL_LENGTH) return false;
    if (INTENT_KEYWORDS.test(clean)) return true;

    // Only bother with an AI call for something that reads like a real question —
    // avoids burning API calls on "nice 😍" or "🙌🙌🙌".
    if (!clean.includes("?") || clean.split(/\s+/).length < 3) return false;
    if (!isFireworksEnabled() && !process.env.GEMINI_API_KEY) return false;

    try {
        const result = await fireworksJSON<{ intent: boolean }>({
            system: "You classify a single Instagram comment on a product post. Reply with strict JSON only: {\"intent\": true|false}. true means the commenter is showing real purchase interest (asking price, availability, how to buy, requesting a DM/link). false means it's a generic reaction, compliment, unrelated question, or spam.",
            prompt: `Comment: "${clean}"`,
            jsonMode: true,
            temperature: 0,
            maxTokens: 20,
            timeoutMs: 4000,
        });
        return !!result?.intent;
    } catch {
        return false; // never let a slow/failed AI call block the webhook ack
    }
}

interface IgCommentChange {
    field: string;
    value: {
        id?: string;
        text?: string;
        from?: { id?: string; username?: string };
        media?: { id?: string; media_product_type?: string };
    };
}

async function handleComment(igAccountId: string, change: IgCommentChange) {
    const { text, from, media } = change.value || {};
    if (!text || !from?.username) return;

    const seller = await db.seller.findFirst({
        where: { instagramUserId: igAccountId },
        select: { id: true, businessName: true },
    });
    if (!seller) return; // comment on an account we don't have linked — ignore

    const hasIntent = await classifyIntent(text);
    if (!hasIntent) return;

    const postLink = media?.id ? `https://www.instagram.com/p/${media.id}/` : undefined;
    await notifySeller(
        seller.id,
        `💬 Possible buyer on Instagram: @${from.username} commented "${text}" on your post — looks like purchase interest.`,
        { type: "system", link: postLink, alsoWhatsApp: true }
    );
}

/**
 * POST — Receives real-time Instagram events (comments, once the
 * `instagram_business_manage_comments` webhook field is subscribed in the
 * Meta App dashboard). Detects purchase-intent comments on a connected
 * seller's posts and notifies them — nothing here posts/replies on the
 * seller's behalf without them acting from the notification.
 */
export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new NextResponse("OK", { status: 200 });
    }

    try {
        const entries = Array.isArray(body?.entry) ? body.entry : [];
        for (const entry of entries) {
            const igAccountId = entry?.id;
            const changes: IgCommentChange[] = Array.isArray(entry?.changes) ? entry.changes : [];
            for (const change of changes) {
                if (change.field === "comments" && igAccountId) {
                    // Don't await inline in a loop that blocks the webhook ack for long —
                    // fire-and-forget per comment, Meta only needs a fast 200.
                    handleComment(igAccountId, change).catch((e) => console.error("[IG Webhook] comment handling failed:", e));
                }
            }
        }
    } catch (e) {
        console.error("[IG Webhook] error:", e);
    }

    return new NextResponse("OK", { status: 200 });
}
