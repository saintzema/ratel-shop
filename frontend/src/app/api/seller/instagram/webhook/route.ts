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

interface IgMessagingEvent {
    sender?: { id?: string };
    recipient?: { id?: string };
    timestamp?: number;
    message?: { mid?: string; text?: string; is_echo?: boolean };
}

/**
 * A buyer DM answered with the seller's real, current catalog — same shape of
 * AI FAQ/product-question responder as ZEMA 360 runs on WhatsApp, deliberately
 * simpler (no price negotiation, no order placement — those require a human,
 * by design, same "0% false payouts" instinct behind the WhatsApp Finance
 * Agent's human-in-the-loop gate). Returns null when the AI isn't confident
 * this is a plain product question, so the caller hands off to the seller
 * instead of guessing.
 */
async function draftDmReply(sellerId: string, sellerName: string, buyerText: string): Promise<string | null> {
    if (!isFireworksEnabled() && !process.env.GEMINI_API_KEY) return null;

    const products = await db.product.findMany({
        where: { sellerId, isActive: true },
        select: { name: true, price: true, description: true, stock: true },
        take: 30,
        orderBy: { soldCount: "desc" },
    });
    if (products.length === 0) return null;

    const catalog = products
        .map(p => `- ${p.name}: NGN ${p.price.toLocaleString()}${p.stock > 0 ? "" : " (out of stock)"} — ${(p.description || "").slice(0, 100)}`)
        .join("\n");

    try {
        const result = await fireworksJSON<{ canAnswer: boolean; reply: string }>({
            system: `You are a helpful assistant answering an Instagram DM on behalf of "${sellerName}", a Nigerian seller on FairPrice.ng. Answer ONLY plain product questions (price, availability, specs) using the catalog below — never invent a price or product that isn't listed. If the buyer is trying to negotiate a price, place an order, complain, or asks anything you can't answer from this catalog, set canAnswer to false so a human takes over. Reply with strict JSON only: {"canAnswer": true|false, "reply": "short, friendly, human-sounding answer — no markdown, no emoji spam"}.

Catalog:
${catalog}`,
            prompt: `Buyer DM: "${buyerText}"`,
            jsonMode: true,
            temperature: 0.3,
            maxTokens: 200,
            timeoutMs: 6000,
        });
        if (!result || !result.canAnswer || !result.reply) return null;
        return result.reply;
    } catch {
        return null;
    }
}

async function sendInstagramDm(igAccountId: string, token: string, recipientId: string, text: string) {
    const res = await fetch(`https://graph.instagram.com/${igAccountId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    const data = await res.json();
    if (data.error) console.error("[IG Webhook] DM send failed:", data.error);
    return !data.error;
}

async function handleMessage(igAccountId: string, event: IgMessagingEvent) {
    const buyerId = event.sender?.id;
    const text = event.message?.text;
    // is_echo marks our OWN outbound messages being echoed back to the webhook —
    // without this guard, every auto-reply would trigger another "inbound"
    // message, which would trigger another reply, forever.
    if (!buyerId || !text || event.message?.is_echo) return;

    const seller = await db.seller.findFirst({
        where: { instagramUserId: igAccountId },
        select: { id: true, businessName: true, instagramAccessToken: true },
    });
    if (!seller?.instagramAccessToken) return;

    const reply = await draftDmReply(seller.id, seller.businessName, text);

    if (reply) {
        const sent = await sendInstagramDm(igAccountId, seller.instagramAccessToken, buyerId, reply);
        if (sent) return;
        // Fall through to human handoff if the send itself failed.
    }

    await notifySeller(
        seller.id,
        `📩 Instagram DM needs your reply: "${text}"`,
        { type: "system", link: "https://www.instagram.com/direct/inbox/", alsoWhatsApp: true }
    );
}

/**
 * POST — Receives real-time Instagram events: comments (once
 * `instagram_business_manage_comments` is subscribed) and DMs (once
 * `messages` is subscribed) in the Meta App dashboard's Webhooks config.
 * Comments get purchase-intent detection + a seller notification. DMs get an
 * AI-drafted reply for plain product questions the seller's real catalog can
 * answer, or a handoff notification for anything else (negotiation, orders,
 * complaints) — nothing here ever auto-replies with a price it invented or
 * auto-places an order.
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
            const messaging: IgMessagingEvent[] = Array.isArray(entry?.messaging) ? entry.messaging : [];
            for (const event of messaging) {
                if (igAccountId) {
                    handleMessage(igAccountId, event).catch((e) => console.error("[IG Webhook] message handling failed:", e));
                }
            }
        }
    } catch (e) {
        console.error("[IG Webhook] error:", e);
    }

    return new NextResponse("OK", { status: 200 });
}
