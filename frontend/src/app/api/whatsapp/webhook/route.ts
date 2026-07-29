import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { put } from "@vercel/blob";
import { initiatePaystackTransfer, notifySellerPayout, emailSellerPayout } from "@/lib/payout-transfer";
import { notifyAdmins } from "@/lib/admin-notify";

// Always link to the production domain in WhatsApp messages — never a Vercel preview URL.
// Override with FAIRPRICE_URL env var if needed.
const SITE = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";

// Regenerate a listing's marketing content from a seller-supplied product name, reusing
// the SAME engine as the admin/seller "AI Auto-Fill" (/api/gemini-seller). Used when Qwen-VL
// misidentifies a product from its photo and the seller corrects the name over WhatsApp.
// Best-effort: returns null on any failure so the caller keeps the original details.
async function regenerateListingFromName(
    productName: string,
    category?: string
): Promise<{ description?: string; tags?: string[]; specs?: Record<string, unknown>; subcategory?: string; highlights?: string[] } | null> {
    try {
        const res = await fetch(`${SITE}/api/gemini-seller`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productName, category: category || "General" }),
            signal: AbortSignal.timeout(45_000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.description) return null;
        return data;
    } catch {
        return null;
    }
}

// Looks up ZEMA's AI fair-price estimate using the exact same engine NavSearch uses for
// global-search price suggestions, so sellers get a consistent number platform-wide.
async function getFairPriceSuggestion(productName: string): Promise<number | null> {
    try {
        const res = await fetch(`${SITE}/api/gemini-price`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productName, region: "Nigeria", mode: "analyze" }),
            signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const price = Number(data?.recommendedPrice);
        return Number.isFinite(price) && price > 100 ? price : null;
    } catch {
        return null;
    }
}

// Parses a seller's price reply — handles plain numbers ("45000"), comma thousands-
// separators ("45,000"), and K/M shorthand ("150K", "2.5M"). Returns null (rather than a
// wrong number) for anything that reads like a sentence rather than a bare price, since a
// name-correction message that slips past the NAME regex (too long, missing whitespace,
// stray punctuation) must never get silently digit-mangled into a garbage price — it should
// fail loudly ("that doesn't look like a price") instead.
function parsePriceReply(raw: string): number | null {
    const text = (raw || "").trim();
    if (!text) return null;

    // Reject sentence-like input outright: more than 2 "words", or any letters besides a
    // single trailing K/M suffix, means this isn't a bare price reply.
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > 2) return null;
    const strippedOfSuffix = text.replace(/[km]$/i, "");
    if (/[a-zA-Z]/.test(strippedOfSuffix)) return null;

    const kmMatch = text.replace(/,/g, "").match(/^(\d+(?:\.\d+)?)\s*([km])$/i);
    if (kmMatch) {
        const base = parseFloat(kmMatch[1]);
        const multiplier = kmMatch[2].toLowerCase() === "k" ? 1_000 : 1_000_000;
        return Number.isFinite(base) ? base * multiplier : null;
    }

    // Plain number, commas stripped as thousands separators. A bare "." is treated as a
    // genuine decimal (e.g. "45000.50"), never as a thousands separator — Naira prices
    // typed with 3-zero decimal groups like "45.000" are rare enough that guessing wrong
    // here would be worse than just asking the seller to retype without the period.
    const cleaned = text.replace(/,/g, "");
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    const price = parseFloat(cleaned);
    if (!Number.isFinite(price)) return null;
    // Sanity cap — a stray phone number (e.g. a contact card, or "call me on
    // 2348162816305") is a bare 11-13 digit string with no letters or spaces, so it
    // passes every check above and gets parsed as a literal ₦2.3 trillion price/offer.
    // No real FairPrice listing needs a ₦1B+ price; reject anything past that instead.
    const MAX_REASONABLE_PRICE = 1_000_000_000;
    if (price > MAX_REASONABLE_PRICE) return null;
    return price;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "fairprice_verify_token";
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const entry   = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value   = changes?.value;
        const message = value?.messages?.[0];

        if (!message) return NextResponse.json({ ok: true });

        const contact = value?.contacts?.[0];

        // ── WhatsApp usernames / BSUID ────────────────────────────────────────
        // Since usernames rolled out, a customer messaging us for the first time
        // can arrive with NO phone number: `message.from` and `contacts[].wa_id`
        // are both omitted, and the only identifier is Meta's business-scoped
        // user ID. The old code read message.from and bailed out when it was
        // empty — which would have silently swallowed every single message from
        // a username adopter (returning ok:true, doing nothing, no error, no log).
        //
        // The BSUID is present on EVERY inbound message (username user or not),
        // so we record it against the user the first time we see them alongside
        // a phone number, and from then on it identifies them even when Meta
        // stops sending the number.
        const bsuid: string = message.from_user_id || contact?.user_id || "";
        const waUsername: string = contact?.profile?.username || "";
        const phone: string = message.from || contact?.wa_id || "";

        // Prefer the phone number (everything downstream — negotiations, orders,
        // seller lookup — is keyed on it). With no phone, fall back to a phone we
        // previously recorded for this BSUID, and only then to the BSUID itself,
        // which is a valid send target via the Cloud API `recipient` field.
        let from: string = phone;
        if (!from && bsuid) {
            const known = await db.user.findUnique({
                where: { whatsappUserId: bsuid },
                select: { whatsappNumber: true },
            }).catch(() => null);
            from = known?.whatsappNumber || bsuid;
        }

        // Guard: ignore genuinely malformed messages — no phone AND no BSUID.
        if (!from || !from.trim()) return NextResponse.json({ ok: true });

        // WhatsApp profile name from the contacts array (the sender's WA display name)
        const contactName: string = contact?.profile?.name || "";

        // Record the BSUID (and username) against this contact so we can still
        // recognise them once Meta stops including their phone number.
        if (bsuid && phone) {
            db.user.updateMany({
                where: { whatsappNumber: phone },
                data: {
                    whatsappUserId: bsuid,
                    ...(waUsername ? { whatsappUsername: waUsername } : {}),
                },
            }).catch(() => {});
        }

        // If WA sent us a real name, update any existing user matched by whatsappNumber —
        // this covers bulk-imported users (wa_) who still show as "WhatsApp User"
        if (contactName) {
            db.user.updateMany({
                where: {
                    ...(phone ? { whatsappNumber: from } : { whatsappUserId: bsuid }),
                    name: { in: ["WhatsApp User", "WhatsApp Buyer"] },
                },
                data: { name: contactName },
            }).catch(() => {});
        }

        const text = (
            message.text?.body?.trim()
            || message.interactive?.button_reply?.title?.trim()
            || message.interactive?.list_reply?.title?.trim()
            || message.button?.text?.trim()
            || ""
        );

        const FC_URL   = process.env.ZEMA_FC_URL || "https://zema-api-nceagrcrdd.ap-southeast-1.fcapp.run";
        const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

        // ─────────────────────────────────────────────────────────────────────
        // IMAGE HANDLER
        // Covers three cases:
        //   A) Seller is in zema_add_image_choice state → add to existing product
        //   B) Seller has a recently completed listing (<2 h) → ask ADD or NEW
        //   C) Normal flow → Qwen-VL analyse and start a new listing
        // ─────────────────────────────────────────────────────────────────────
        if (message.type === "image" && message.image?.id) {
            // Download image once (used in all cases)
            let dataUrl = "";
            try {
                const metaRes  = await fetch(`https://graph.facebook.com/v18.0/${message.image.id}`,
                    { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
                const metaJson = await metaRes.json() as { url: string; mime_type?: string };
                const mime     = metaJson.mime_type || "image/jpeg";
                const imgRes   = await fetch(metaJson.url, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
                const arrayBuf = await imgRes.arrayBuffer();

                // Upload to Vercel Blob so the URL is permanent and doesn't bloat localStorage.
                // WhatsApp media URLs expire after 24 h; base64 gets stripped by sync-store.
                if (process.env.BLOB_READ_WRITE_TOKEN) {
                    const ext  = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
                    const blob = await put(
                        `wa-products/${from.replace(/\D/g, "")}/${Date.now()}.${ext}`,
                        arrayBuf,
                        { access: "public", contentType: mime }
                    );
                    dataUrl = blob.url;
                } else {
                    // Fallback to base64 if Blob token is absent (dev without env)
                    dataUrl = `data:${mime};base64,${Buffer.from(arrayBuf).toString("base64")}`;
                }
            } catch (downloadErr) {
                console.error("[ZEMA] image download failed", downloadErr);
                await WhatsAppService.sendMessage(from, "⚠️ Couldn't download your image. Please try again.");
                return NextResponse.json({ ok: true });
            }

            // Case 0 — batch photos: a seller shooting one item from multiple angles used
            // to have every photo after the first restart analysis from scratch (silently
            // discarding the previous draft) or, once a listing was published, get asked
            // ADD/NEW on every single photo. If there's already an un-priced draft for this
            // phone, treat this image as "another photo of the same item" — append it and
            // keep waiting for a price, instead of re-analysing or prompting anything.
            const openDraft = await db.whatsAppInteraction.findFirst({
                where: { phoneNumber: from, interaction_type: "zema_listing_draft" },
                orderBy: { createdAt: "desc" },
            });
            if (openDraft?.payload) {
                const d = JSON.parse(openDraft.payload) as { status: string; photos?: string[]; imageUrl: string; listing?: { title?: string } };
                if (d.status === "awaiting_price") {
                    const photos = [...(d.photos || [d.imageUrl]), dataUrl];
                    await db.whatsAppInteraction.update({
                        where: { id: openDraft.id },
                        data: { payload: JSON.stringify({ ...d, photos }) },
                    });
                    await WhatsAppService.sendMessage(from,
                        `📸 Photo added (${photos.length} total for *${d.listing?.title || "this listing"}*).\n\n` +
                        `Send more, or *reply with your asking price* to finish.`);
                    return NextResponse.json({ ok: true });
                }
            }

            // Case A — seller is in "add image" choice flow
            const addChoice = await db.whatsAppInteraction.findFirst({
                where: { phoneNumber: from, interaction_type: "zema_add_image_choice" },
                orderBy: { createdAt: "desc" },
            });
            if (addChoice) {
                // New image arrived while waiting for ADD/NEW choice — treat as "NEW"
                await db.whatsAppInteraction.update({
                    where: { id: addChoice.id },
                    data: { interaction_type: "zema_add_image_choice_expired" },
                });
            }

            // Case B — check for recent completed listing (last 2 hours)
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const recentCompleted = await db.whatsAppInteraction.findFirst({
                where: {
                    phoneNumber: from,
                    interaction_type: "zema_listing_completed",
                    createdAt: { gte: twoHoursAgo },
                },
                orderBy: { createdAt: "desc" },
            });

            if (recentCompleted?.payload) {
                const prev = JSON.parse(recentCompleted.payload) as { productId?: string; listing?: { title?: string } };
                const productName = prev.listing?.title || "your recent listing";

                if (prev.productId) {
                    // Save choice state so the text handler can act on ADD / NEW
                    await db.whatsAppInteraction.create({ data: {
                        phoneNumber: from,
                        interaction_type: "zema_add_image_choice",
                        payload: JSON.stringify({ productId: prev.productId, productName, dataUrl }),
                    }});

                    await WhatsAppService.sendMessage(from,
                        `📸 Got your photo!\n\n` +
                        `Is this an *extra photo* for _${productName}_, or a *new product*?\n\n` +
                        `Reply *ADD* to add it to that listing, or *NEW* to create a fresh one.`
                    );
                    return NextResponse.json({ ok: true });
                }
            }

            // Case C — new listing flow via Qwen-VL
            await WhatsAppService.sendMessage(from,
                "*ZEMA 360 scanning your product photo...*\n_Powered by Qwen-VL · Alibaba Cloud_"
            );

            try {
                const ingestRes = await fetch(`${FC_URL}/api/v1/zema/ingest`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ seller_id: from, image_urls: [dataUrl] }),
                    signal: AbortSignal.timeout(55_000),
                });
                const { listing } = await ingestRes.json() as {
                    listing?: { title: string; category: string; condition: string;
                                price_ngn: number | null; description: string;
                                tags: string[]; confidence: number };
                };

                if (listing?.title) {
                    await db.whatsAppInteraction.updateMany({
                        where: { phoneNumber: from, interaction_type: "zema_listing_draft" },
                        data:  { interaction_type: "zema_listing_draft_expired" },
                    }).catch(() => {});

                    // Qwen-VL's image scan only ever returns title/category/condition/price/
                    // description/tags — it never produces specs or highlights, and its
                    // description reads more like an image caption than a real product
                    // listing. Previously that gap only closed if the seller sent a NAME
                    // correction. Run the SAME enrichment the admin/seller "AI Auto-Fill"
                    // button uses right here, so every listing gets full specs/highlights/
                    // description quality from the very first scan — not just corrections.
                    const enriched = await regenerateListingFromName(listing.title, listing.category);
                    const enrichedListing = enriched ? {
                        ...listing,
                        description: enriched.description || listing.description,
                        tags: (enriched.tags && enriched.tags.length ? enriched.tags : listing.tags) || [],
                        ...(enriched.specs ? { specs: enriched.specs } : {}),
                        ...(enriched.highlights ? { highlights: enriched.highlights } : {}),
                        ...(enriched.subcategory ? { subcategory: enriched.subcategory } : {}),
                    } : listing;

                    await db.whatsAppInteraction.create({ data: {
                        phoneNumber: from,
                        interaction_type: "zema_listing_draft",
                        payload: JSON.stringify({
                            status: "awaiting_price",
                            listing: enrichedListing,
                            imageUrl: dataUrl,
                            mediaId: message.image.id,
                        }),
                    }});

                    const priceHint = listing.price_ngn
                        ? `\n💡 ZEMA suggests ≈ ₦${listing.price_ngn.toLocaleString()}` : "";

                    await WhatsAppService.sendMessage(from,
                        `✅ *ZEMA 360 — Product Analysed*\n\n` +
                        `📦 *${enrichedListing.title}*\n` +
                        `📂 ${enrichedListing.category}  |  🏷️ ${enrichedListing.condition}${priceHint}\n\n` +
                        `📝 ${enrichedListing.description}\n\n` +
                        `🔖 Tags: ${(enrichedListing.tags || []).join(", ")}\n` +
                        `🎯 Confidence: ${Math.round((listing.confidence || 0) * 100)}%\n\n` +
                        `*Reply with your asking price* (numbers only, e.g. *45000*, or *150K*/*2.5M*) — or reply *SUGGEST* for an AI fair-price estimate.\n\n` +
                        `❌ Wrong product? Reply *NAME* then the correct name (e.g. *NAME Toyota Venza 2021*) and I'll regenerate the details for you.`
                    );
                } else {
                    await WhatsAppService.sendMessage(from,
                        "⚠️ ZEMA couldn't read that image clearly.\n\nPlease send a well-lit, close-up photo against a plain background.");
                }
            } catch (err: unknown) {
                console.error("[ZEMA Ingest WhatsApp]", err instanceof Error ? err.message : err);
                await WhatsAppService.sendMessage(from, "⚠️ ZEMA image scan hit a snag. Please try again in a moment.");
            }
            return NextResponse.json({ ok: true });
        }

        if (!text && !message.interactive) return NextResponse.json({ ok: true });

        // ─────────────────────────────────────────────────────────────────────
        // ACTIVE DRAFT — steps 2 & 3 (price → confirm → publish)
        // ─────────────────────────────────────────────────────────────────────
        const activeDraftRow = await db.whatsAppInteraction.findFirst({
            where: { phoneNumber: from, interaction_type: "zema_listing_draft" },
            orderBy: { createdAt: "desc" },
        });

        if (activeDraftRow?.payload) {
            const draft = JSON.parse(activeDraftRow.payload) as {
                status: string; listing: Record<string, unknown>;
                imageUrl: string; price?: number; photos?: string[];
            };

            // ── Universal name correction ────────────────────────────────────
            // Qwen-VL image recognition is still improving and sometimes mislabels a
            // product (e.g. a Venza read as a RAV4). At ANY draft step the seller can
            // reply "NAME <correct product name>" and we regenerate a marketplace-grade
            // description / specs / tags from that name using the same AI Auto-Fill engine
            // the admin & seller product forms use, then return them to where they were.
            // Cap raised from 80 to 150 — long, punctuation-heavy product names (common
            // for imported/electronics listings) were exceeding the old cap and silently
            // falling through to price parsing instead. parsePriceReply's sentence-guard
            // now also independently blocks any sentence-like text from being misread as
            // a price, so this length cap failing is no longer a silent-corruption path.
            const nameCmd = (text || "").trim().match(/^(?:name|rename|edit|correct|fix)[\s:,-]+(.{2,150})$/i);
            if (nameCmd) {
                const newName = nameCmd[1].trim().replace(/\s+/g, " ");
                const l = draft.listing as Record<string, any>;
                await WhatsAppService.sendMessage(from,
                    `✏️ Got it — updating to *${newName}* and regenerating the listing details…`);

                const regen = await regenerateListingFromName(newName, l.category as string);
                const updatedListing: Record<string, any> = {
                    ...l,
                    title: newName,
                    description: regen?.description || l.description,
                    tags: (regen?.tags && regen.tags.length ? regen.tags : l.tags) || [],
                    ...(regen?.specs ? { specs: regen.specs } : {}),
                    confidence: 1, // seller-confirmed name
                };
                await db.whatsAppInteraction.update({
                    where: { id: activeDraftRow.id },
                    data: { payload: JSON.stringify({ ...draft, listing: updatedListing }) },
                });

                const priceLine = draft.status === "awaiting_confirm" && draft.price
                    ? `💰 Price: ₦${Number(draft.price).toLocaleString()}\n`
                    : (updatedListing.price_ngn ? `💡 ZEMA suggests ≈ ₦${Number(updatedListing.price_ngn).toLocaleString()}\n` : "");
                const nextStep = draft.status === "awaiting_confirm"
                    ? `Reply *YES* to publish, or *NAME* + a different name to change it again.`
                    : `*Reply with your asking price* (numbers only, e.g. *45000*) to continue.\nStill wrong? Reply *NAME* + the correct name again.`;

                await WhatsAppService.sendMessage(from,
                    `✅ *Updated — ${newName}*\n\n` +
                    `📦 *${newName}*\n` +
                    `📂 ${updatedListing.category}  |  🏷️ ${updatedListing.condition}\n` +
                    priceLine + `\n` +
                    `📝 ${updatedListing.description}\n\n` +
                    `🔖 Tags: ${(updatedListing.tags || []).join(", ")}\n` +
                    (regen ? `` : `\n_(AI couldn't refresh the details just now — kept the previous description.)_\n`) +
                    `\n${nextStep}`
                );
                return NextResponse.json({ ok: true });
            }

            if (draft.status === "awaiting_price") {
                const l0 = draft.listing as { title: string; category: string; condition: string; description: string };
                const isSuggestCmd = /^suggest(\s+fair\s*price)?$/i.test(text.trim());

                let price: number | null = null;
                let suggestedNote = "";
                if (isSuggestCmd) {
                    price = await getFairPriceSuggestion(l0.title);
                    if (price === null) {
                        await WhatsAppService.sendMessage(from,
                            "⚠️ ZEMA couldn't get a fair-price estimate right now. Please reply with your own asking price instead.");
                        return NextResponse.json({ ok: true });
                    }
                    suggestedNote = "🤖 _AI-suggested fair price — reply YES to accept, or CANCEL to start over with your own price._\n";
                } else {
                    price = parsePriceReply(text);
                }

                if (price !== null && price > 100) {
                    await db.whatsAppInteraction.update({
                        where: { id: activeDraftRow.id },
                        data: { payload: JSON.stringify({ ...draft, status: "awaiting_confirm", price }) },
                    });
                    await WhatsAppService.sendMessage(from,
                        `📋 *Confirm your listing*\n\n` +
                        `📦 *${l0.title}*\n` +
                        `💰 Price: ₦${price.toLocaleString()}\n` +
                        `📂 ${l0.category}  |  🏷️ ${l0.condition}\n` +
                        `📝 ${l0.description}\n\n` +
                        suggestedNote +
                        `Reply *YES* to publish live on FairPrice.ng, or *CANCEL* to start over.`
                    );
                } else {
                    await WhatsAppService.sendMessage(from,
                        "⚠️ That doesn't look like a valid price. Reply with just the number (e.g. *45000*, *150K*, or *2.5M*), or *SUGGEST* for an AI fair-price estimate.");
                }
                return NextResponse.json({ ok: true });
            }

            if (draft.status === "awaiting_confirm") {
                const upper = text.toUpperCase().trim();

                if (upper === "CANCEL" || upper === "NO") {
                    await db.whatsAppInteraction.update({
                        where: { id: activeDraftRow.id },
                        data: { interaction_type: "zema_listing_draft_cancelled" },
                    });
                    await WhatsAppService.sendMessage(from, "Listing cancelled. Send a new product photo whenever you're ready.");
                    return NextResponse.json({ ok: true });
                }

                if (upper === "YES" || upper === "CONFIRM") {
                    try {
                        // Admin number always publishes to Global Stores catalogue
                        const ADMIN_WA = (process.env.ZEMA_APPROVER_WHATSAPP || "+2348162816305").replace(/\D/g, "").slice(-10);
                        const fromDigits10 = from.replace(/\D/g, "").slice(-10);
                        const isAdmin = fromDigits10 === ADMIN_WA;

                        let seller = isAdmin
                            ? await db.seller.findFirst({ where: { id: "global-partners" } })
                                ?? await db.seller.findFirst({ where: { businessName: { contains: "Global" } } })
                            : null;

                        if (!isAdmin) {
                            seller = await db.seller.findFirst({
                                where: { whatsappNumber: { endsWith: fromDigits10 }, status: "active" },
                            });
                            if (!seller) {
                                const normalised = from.startsWith("+") ? from : `+${from}`;
                                const user = await db.user.findFirst({
                                    where: { OR: [{ whatsappNumber: normalised }, { whatsappNumber: from }] },
                                    include: { sellers: { where: { status: "active" }, take: 1 } },
                                });
                                seller = user?.sellers?.[0] ?? null;
                            }
                        }

                        if (!seller) {
                            await WhatsAppService.sendMessage(from,
                                `⚠️ No FairPrice seller account found for this number.\n\n` +
                                `👉 *Register here:* ${SITE}/seller/register\n\n` +
                                `Once registered, link your WhatsApp in *Seller Settings → Ziva AI-WhatsApp Bridge*, then try again.`
                            );
                            return NextResponse.json({ ok: true });
                        }

                        const l = draft.listing as {
                            title: string; category: string; condition: string;
                            description: string; tags: string[];
                            specs?: Record<string, unknown>; highlights?: string[]; subcategory?: string;
                        };
                        const conditionMap: Record<string, "brand_new" | "used" | "refurbished"> = {
                            new: "brand_new", fairly_used: "refurbished", used: "used",
                        };
                        const condition = conditionMap[l.condition as string] ?? "used";
                        const slug = (l.title || "product")
                            .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

                        const product = await db.product.create({ data: {
                            sellerId:    seller.id,
                            sellerName:  seller.businessName,
                            name:        l.title,
                            description: l.description,
                            price:       draft.price!,
                            category:    l.category.split("|")[0].trim(),
                            subcategory: l.subcategory || (l.category.includes("|") ? l.category.split("|")[1].trim() : undefined),
                            // `photos` holds every image the seller sent before setting a
                            // price (batch upload) — falls back to the single first photo
                            // for the normal one-photo listing.
                            imageUrl:    (draft.photos && draft.photos[0]) || draft.imageUrl,
                            images:      (draft.photos && draft.photos.length) ? draft.photos : [draft.imageUrl],
                            tags:        l.tags || [],
                            specs:       (l.specs as any) || undefined,
                            highlights:  l.highlights || [],
                            condition,
                            slug,
                            stock:       1,
                            isActive:    true,
                        }});

                        await db.whatsAppInteraction.update({
                            where: { id: activeDraftRow.id },
                            data: {
                                interaction_type: "zema_listing_completed",
                                payload: JSON.stringify({ ...draft, status: "completed", productId: product.id, listing: l }),
                            },
                        });

                        const productUrl = `${SITE}/product/${product.id}/${slug}`;
                        await WhatsAppService.sendCTALink(
                            from,
                            `🎉 *Your product is LIVE on FairPrice.ng!*\n\n📦 *${l.title}*\n💰 ₦${draft.price!.toLocaleString()}\n\nBuyers can order and pay into escrow right now. You'll be notified when an order comes in. 🚀\n\n📸 *Have more photos?* Send them now and I'll add them to this listing!`,
                            "View My Listing",
                            productUrl
                        );
                    } catch (createErr: unknown) {
                        console.error("[ZEMA CreateProduct]", createErr instanceof Error ? createErr.message : createErr);
                        await WhatsAppService.sendMessage(from,
                            `⚠️ Something went wrong creating your listing. Please try again or visit ${SITE}/seller.`);
                    }
                    return NextResponse.json({ ok: true });
                }

                await WhatsAppService.sendMessage(from,
                    "Reply *YES* to publish your listing, or *CANCEL* to start over.");
                return NextResponse.json({ ok: true });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // ADD IMAGE CHOICE — seller replied ADD or NEW after being prompted
        // ─────────────────────────────────────────────────────────────────────
        const addChoiceRow = await db.whatsAppInteraction.findFirst({
            where: { phoneNumber: from, interaction_type: "zema_add_image_choice" },
            orderBy: { createdAt: "desc" },
        });

        if (addChoiceRow?.payload) {
            const upper = text.toUpperCase().trim();

            if (upper === "ADD") {
                const choice = JSON.parse(addChoiceRow.payload) as { productId: string; productName: string; dataUrl: string };
                try {
                    const product = await db.product.findUnique({ where: { id: choice.productId }, select: { images: true, name: true } });
                    if (product) {
                        const updatedImages = [...(product.images || []), choice.dataUrl];
                        await db.product.update({
                            where: { id: choice.productId },
                            data: { images: updatedImages, imageUrl: updatedImages[0] },
                        });
                        await db.whatsAppInteraction.update({
                            where: { id: addChoiceRow.id },
                            data: { interaction_type: "zema_add_image_done" },
                        });
                        await WhatsAppService.sendMessage(from,
                            `✅ Photo added to *${product.name}*! (${updatedImages.length} photo${updatedImages.length > 1 ? "s" : ""} total)\n\n` +
                            `📸 Send another photo to keep adding, or any message to continue.`
                        );
                    } else {
                        await WhatsAppService.sendMessage(from, "⚠️ Couldn't find that product. It may have been deleted.");
                    }
                } catch (addErr) {
                    console.error("[ZEMA AddImage]", addErr);
                    await WhatsAppService.sendMessage(from, "⚠️ Couldn't add the photo right now. Please try again.");
                }
                await db.whatsAppInteraction.update({
                    where: { id: addChoiceRow.id },
                    data: { interaction_type: "zema_add_image_done" },
                }).catch(() => {});
                return NextResponse.json({ ok: true });
            }

            if (upper === "NEW" || upper === "NEW LISTING") {
                await db.whatsAppInteraction.update({
                    where: { id: addChoiceRow.id },
                    data: { interaction_type: "zema_add_image_choice_expired" },
                });
                // Re-use the saved dataUrl to start the Qwen-VL flow
                const choice = JSON.parse(addChoiceRow.payload) as { dataUrl: string };
                await WhatsAppService.sendMessage(from,
                    "*ZEMA 360 scanning your product photo...*\n_Powered by Qwen-VL · Alibaba Cloud_"
                );
                try {
                    const ingestRes = await fetch(`${FC_URL}/api/v1/zema/ingest`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ seller_id: from, image_urls: [choice.dataUrl] }),
                        signal: AbortSignal.timeout(55_000),
                    });
                    const { listing } = await ingestRes.json() as { listing?: { title: string; category: string; condition: string; price_ngn: number | null; description: string; tags: string[]; confidence: number } };
                    if (listing?.title) {
                        await db.whatsAppInteraction.create({ data: {
                            phoneNumber: from,
                            interaction_type: "zema_listing_draft",
                            payload: JSON.stringify({ status: "awaiting_price", listing, imageUrl: choice.dataUrl }),
                        }});
                        const priceHint = listing.price_ngn ? `\n💡 ZEMA suggests ≈ ₦${listing.price_ngn.toLocaleString()}` : "";
                        await WhatsAppService.sendMessage(from,
                            `✅ *ZEMA 360 — Product Analysed*\n\n` +
                            `📦 *${listing.title}*\n` +
                            `📂 ${listing.category}  |  🏷️ ${listing.condition}${priceHint}\n\n` +
                            `📝 ${listing.description}\n\n` +
                            `🔖 Tags: ${(listing.tags || []).join(", ")}\n` +
                            `🎯 Confidence: ${Math.round((listing.confidence || 0) * 100)}%\n\n` +
                            `*Reply with your asking price* (numbers only, e.g. *45000*) to continue listing on FairPrice.ng ↓`
                        );
                    } else {
                        await WhatsAppService.sendMessage(from, "⚠️ ZEMA couldn't read that image. Please send a clearer photo.");
                    }
                } catch (err) {
                    await WhatsAppService.sendMessage(from, "⚠️ ZEMA image scan hit a snag. Please try again.");
                }
                return NextResponse.json({ ok: true });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // NEGOTIATE CHOICE — user picks a numbered product from /negotiate list
        // ─────────────────────────────────────────────────────────────────────
        const negotiateChoiceRow = await db.whatsAppInteraction.findFirst({
            where: { phoneNumber: from, interaction_type: "zema_negotiate_choice" },
            orderBy: { createdAt: "desc" },
        });

        if (negotiateChoiceRow?.payload) {
            const pickNum = parseInt(text.trim(), 10);
            const choice = JSON.parse(negotiateChoiceRow.payload) as {
                products: { id: string; name: string; price: number; slug: string | null; sellerId: string }[];
            };

            if (!isNaN(pickNum) && pickNum >= 1 && pickNum <= choice.products.length) {
                const picked = choice.products[pickNum - 1];
                await db.whatsAppInteraction.update({
                    where: { id: negotiateChoiceRow.id },
                    data: { interaction_type: "zema_negotiate_choice_done" },
                });
                await startWhatsAppNegotiation(from, picked, contactName);
                return NextResponse.json({ ok: true });
            }
            // If they typed something non-numeric, let it fall through to normal handling
            // and expire the choice so it doesn't ghost future messages
            if (!/^\d+$/.test(text.trim())) {
                await db.whatsAppInteraction.update({
                    where: { id: negotiateChoiceRow.id },
                    data: { interaction_type: "zema_negotiate_choice_expired" },
                }).catch(() => {});
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // LOG & NORMALIZE
        // ─────────────────────────────────────────────────────────────────────
        await db.whatsAppInteraction.create({
            data: {
                phoneNumber: from,
                interaction_type: "inbound_message",
                payload: JSON.stringify({ text, raw: message, timestamp: new Date().toISOString() }),
            },
        }).catch(() => {});

        const normalizedFrom = WhatsAppService.normalizePhoneNumber(from);

        // ─────────────────────────────────────────────────────────────────────
        // VERIFY FAIRPRICE (login OTP)
        // ─────────────────────────────────────────────────────────────────────
        if (text.toLowerCase().startsWith("verify fairprice:")) {
            const code = text.split(":")[1]?.trim();
            if (code) {
                const verification = await db.whatsAppVerification.findUnique({ where: { code } });
                if (verification && new Date() < verification.expiresAt) {
                    await db.whatsAppVerification.update({ where: { id: verification.id }, data: { status: "verified" } });
                    await WhatsAppService.sendMessage(from,
                        `✅ *Verified!* Your account is now linked to WhatsApp.\n\n🔗 Back to FairPrice: ${SITE}/login?wa_code=${code}`);
                    return NextResponse.json({ ok: true });
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // ZEMA HITL APPROVAL (approve / reject <runId>)
        // ─────────────────────────────────────────────────────────────────────
        const ZEMA_APPROVER = (process.env.ZEMA_APPROVER_WHATSAPP || "+2348162816305").replace(/\D/g, "");
        const fromDigits = from.replace(/\D/g, "");
        const isApprover = fromDigits.endsWith(ZEMA_APPROVER) || ZEMA_APPROVER.endsWith(fromDigits);

        if (isApprover) {
            // Match case-insensitively but preserve the original-case handle —
            // approval codes are UPPERCASE (e.g. ZMA-7G2QK), so we must NOT lowercase them.
            const trimmed = text.trim();
            const approveMatch = trimmed.match(/^approve\s+(\S+)/i);
            const rejectMatch  = trimmed.match(/^reject\s+(\S+)/i);
            const approvalId   = (approveMatch || rejectMatch)?.[1];

            if (approvalId) {
                const decision = approveMatch ? "approved" : "rejected";
                try {
                    // Resolve by runId (short handle, e.g. RUN-XXXX) OR the underlying cuid.
                    const request = await db.zemaApprovalRequest.findFirst({
                        where: { OR: [{ runId: approvalId }, { runId: approvalId.toUpperCase() }, { id: approvalId }] },
                    });
                    if (!request) {
                        await WhatsAppService.sendMessage(from, `⚠️ ZEMA: Approval request *${approvalId}* not found or already resolved.`);
                        return NextResponse.json({ ok: true });
                    }
                    if (request.status !== "pending") {
                        await WhatsAppService.sendMessage(from, `ℹ️ ZEMA: Request *${approvalId}* was already *${request.status}*.`);
                        return NextResponse.json({ ok: true });
                    }
                    await db.zemaApprovalRequest.update({
                        where: { id: request.id },
                        data: { status: decision, approvedBy: from, resolvedAt: new Date() },
                    });
                    const agentData = JSON.parse(request.agentDecision || "{}");

                    // ── High-value auto-payout approval (₦ threshold gate, not marketplace escrow) ──
                    if (agentData.type === "payout") {
                        if (decision === "approved") {
                            const result = await initiatePaystackTransfer({
                                payoutId: agentData.payoutId,
                                amount: agentData.amount,
                                bankName: agentData.bankName,
                                accountNumber: agentData.accountNumber,
                                accountName: agentData.accountName,
                                sellerId: agentData.sellerId,
                                paymentReference: agentData.paymentReference,
                                isAutoPayout: true,
                            });
                            if (result.success) {
                                await notifySellerPayout(agentData.sellerId, agentData.amount, "completed", agentData.payoutId);
                                await emailSellerPayout(agentData.sellerId, agentData.amount, "completed");
                                await notifyAdmins(`✅ Payout ${request.runId} approved & sent: ₦${agentData.amount.toLocaleString()}.`, { type: "order", link: "/admin/payouts" });
                                await WhatsAppService.sendMessage(from, `✅ *Payout Approved*\n\nRun: ${request.runId}\n₦${agentData.amount.toLocaleString()} sent to ${agentData.accountName}.`);
                            } else {
                                await notifySellerPayout(agentData.sellerId, agentData.amount, "failed", agentData.payoutId);
                                await notifyAdmins(`🔴 Approved payout ${request.runId} FAILED to send: ${result.message}.`, { type: "system", link: "/admin/payouts" });
                                await WhatsAppService.sendMessage(from, `⚠️ *Payout Approved but Transfer Failed*\n\nRun: ${request.runId}\nReason: ${result.message}. Requires manual review in admin/payouts.`);
                            }
                        } else {
                            await db.payout.update({ where: { id: agentData.payoutId }, data: { status: "pending" } }).catch(() => {});
                            await notifyAdmins(`❌ Payout ${request.runId} (₦${agentData.amount.toLocaleString()}) rejected — left pending for manual review.`, { type: "system", link: "/admin/payouts" });
                            await WhatsAppService.sendMessage(from, `❌ *Payout Rejected*\n\nRun ${request.runId} cancelled. Left in admin/payouts for manual review.`);
                        }
                        await db.whatsAppInteraction.create({
                            data: { phoneNumber: from, interaction_type: "payout_hitl_resolution", payload: JSON.stringify({ approvalId, decision, runId: request.runId }) },
                        }).catch(() => {});
                        return NextResponse.json({ ok: true });
                    }

                    // ── Marketplace escrow release (ZEMA 360 order HITL) ──
                    if (decision === "approved") {
                        const offer = agentData.offer ?? {};
                        if (request.orderId) {
                            await fetch(`${SITE}/api/escrow/release`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ZEMA_SERVICE_TOKEN || ""}` },
                                body: JSON.stringify({ orderId: request.orderId, releasedBy: "zema_hitl" }),
                            }).catch(() => {});
                        }
                        await WhatsAppService.sendMessage(from,
                            `✅ *ZEMA 360: Approved*\n\nRun: ${request.runId}\nOffer: ₦${offer.price?.toLocaleString() ?? "—"}\n${request.orderId ? `Order: ${request.orderId}\n` : ""}Escrow release queued.`);
                    } else {
                        await WhatsAppService.sendMessage(from, `❌ *ZEMA 360: Rejected*\n\nRun ${request.runId} cancelled. No funds moved.`);
                    }
                    await db.whatsAppInteraction.create({
                        data: { phoneNumber: from, interaction_type: "zema_hitl_resolution", payload: JSON.stringify({ approvalId, decision, runId: request.runId }) },
                    }).catch(() => {});
                } catch (hitlErr: any) {
                    console.error("[HITL] approval error:", hitlErr);
                    await WhatsAppService.sendMessage(from, `⚠️ ZEMA: Error processing *${approvalId}*. Please try again.`);
                }
                return NextResponse.json({ ok: true });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // ZEMA 360 — SELLER PAYMENT QR/LINK FLOW
        // "payment" or /payment starts it; subsequent plain-text replies (email,
        // OTP, label, amount) are captured by the active wa_pay_session below.
        // ─────────────────────────────────────────────────────────────────────
        const lowerText = text.toLowerCase().trim();
        if (lowerText === "payment" || lowerText === "/payment") {
            await startPaymentFlow(from, normalizedFrom);
            return NextResponse.json({ ok: true });
        }

        // ─────────────────────────────────────────────────────────────────────
        // COMMANDS
        // ─────────────────────────────────────────────────────────────────────
        if (text.startsWith("/")) {
            await handleCommand(from, text, contactName);
            return NextResponse.json({ ok: true });
        }

        // Active payment session? (email / OTP / label / amount replies.)
        // Runs after COMMANDS so /help etc. still work mid-session.
        if (await handlePaymentSession(from, normalizedFrom, text)) {
            return NextResponse.json({ ok: true });
        }

        // ─────────────────────────────────────────────────────────────────────
        // ICEBREAKERS
        // ─────────────────────────────────────────────────────────────────────
        const iceBreakers = ["Check Real Market Price", "How much last? Let's bargain", "Apply for Financing", "Help import or source a product"];
        if (iceBreakers.includes(text)) {
            await handleIceBreaker(from, text);
            return NextResponse.json({ ok: true });
        }

        // ─────────────────────────────────────────────────────────────────────
        // SELLER DIRECT REPLY (negotiation counter/accept/reject)
        // ─────────────────────────────────────────────────────────────────────
        const sellerSession = await db.whatsAppNegotiationSession.findFirst({
            where: {
                OR: [
                    { sellerPhone: normalizedFrom },
                    { sellerPhone: `+${normalizedFrom}` },
                    { sellerPhone: from },
                ],
            },
            orderBy: { updatedAt: "desc" },
        });
        if (sellerSession) {
            const upperText = text.toUpperCase().trim();
            if (upperText.startsWith("COUNTER") || upperText === "ACCEPT" || upperText === "REJECT") {
                await handleSellerDirectReply(from, text, sellerSession);
                return NextResponse.json({ ok: true });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // CUSTOMER NEGOTIATION CONTEXT
        // Phone numbers may be stored with or without + prefix; check all variants.
        // ─────────────────────────────────────────────────────────────────────
        const negotiation = await db.negotiationRequest.findFirst({
            where: {
                OR: [
                    { customerWhatsapp: normalizedFrom },
                    { customerWhatsapp: `+${normalizedFrom}` },
                    { customerWhatsapp: from },
                ],
                status: { in: ["pending", "countered"] },
            },
            orderBy: { createdAt: "desc" },
            include: { product: { select: { name: true, price: true, imageUrl: true, category: true, slug: true } } },
        });
        if (negotiation) {
            const upperText = text.toUpperCase().trim();
            if (upperText === "ACCEPT") {
                await db.negotiationRequest.update({ where: { id: negotiation.id }, data: { status: "accepted" } });
                // Agreed price = seller's counter if one exists, otherwise buyer's proposed price
                const agreedPrice = (negotiation as any).counterPrice || negotiation.proposedPrice;
                const p = negotiation.product as any;
                const checkoutParams = new URLSearchParams({
                    productId: negotiation.productId,
                    name:      p.name,
                    amount:    String(Math.round(agreedPrice)),
                    sellerId:  (negotiation as any).sellerId || "",
                    category:  p.category || "general",
                    ...(p.imageUrl ? { image: p.imageUrl } : {}),
                });
                await WhatsAppService.sendCTALink(from,
                    `Deal! 🤝 Your offer for *${p.name}* at ₦${agreedPrice.toLocaleString()} was accepted. Tap below to pay safely via FairPrice Escrow.`,
                    "Complete Payment Now", `${SITE}/checkout/direct?${checkoutParams.toString()}`);
                return NextResponse.json({ ok: true });
            }
            if (upperText === "REJECT") {
                await db.negotiationRequest.update({ where: { id: negotiation.id }, data: { status: "rejected" } });
                await WhatsAppService.sendMessage(from, `Negotiation for *${negotiation.product.name}* closed.`);
                return NextResponse.json({ ok: true });
            }
            // Was a raw parseFloat with no sentence/length guard — any inbound text that
            // happened to be a bare number (e.g. a customer's phone number, sent by
            // itself for delivery contact) got parsed as a literal counter-offer price,
            // once producing a ₦2.3 trillion "offer" from a stray WhatsApp number.
            const price = parsePriceReply(text);
            if (price !== null && price > 100) {
                await db.negotiationRequest.update({ where: { id: negotiation.id }, data: { proposedPrice: price, status: "pending" } });
                // Notify seller about the updated offer
                const negSeller = await db.seller.findUnique({
                    where: { id: negotiation.sellerId },
                    select: { whatsappNumber: true, businessName: true },
                }).catch(() => null);
                if (negSeller?.whatsappNumber) {
                    await WhatsAppService.sendMessage(negSeller.whatsappNumber,
                        `🤝 *Counter-offer on FairPrice!*\n\n` +
                        `📦 ${negotiation.product.name}\n` +
                        `💰 New offer: ₦${price.toLocaleString()}\n\n` +
                        `Reply *ACCEPT*, *REJECT*, or *COUNTER [price]* to respond.\n` +
                        `Negotiation ID: ${negotiation.id}`
                    );
                }
                await WhatsAppService.sendMessage(from, `📝 Counter-offer of *₦${price.toLocaleString()}* sent for *${negotiation.product.name}*. Seller notified!`);
                return NextResponse.json({ ok: true });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // FALLBACK — greeting or fuzzy product search
        // ─────────────────────────────────────────────────────────────────────
        const greetings = ["hi", "hello", "hey", "sup", "menu", "start"];
        if (greetings.includes(text.toLowerCase()) || text.length < 3) {
            await WhatsAppService.sendMessage(from,
                `👋 *Welcome to FairPrice!*\n\n` +
                `Nigeria's first AI-regulated escrow marketplace. Here's what you can do:\n\n` +
                `🛍️ *Buy* — ${SITE}\n` +
                `📸 *Sell* — Send a product photo to list instantly\n` +
                `💰 */price [item]* — Check market price\n` +
                `🤝 */haggle [link]* — Negotiate a price\n` +
                `🛡️ */verify [seller]* — Check seller trust\n` +
                `📋 */help* — See all commands\n\n` +
                `🏪 *Become a seller:* ${SITE}/seller/register\n` +
                `📦 *Seller dashboard:* ${SITE}/seller/dashboard`
            );
        } else {
            try {
                const keywords = text.split(/\s+/).filter((w: string) => w.length > 2);
                const products = await db.product.findMany({
                    where: {
                        OR: keywords.map((kw: string) => ({
                            OR: [
                                { name: { contains: kw, mode: "insensitive" } },
                                { description: { contains: kw, mode: "insensitive" } },
                                { category: { contains: kw, mode: "insensitive" } },
                            ],
                        })),
                        isActive: true,
                    },
                    take: 3,
                    select: { id: true, name: true, price: true, slug: true },
                });

                if (products.length > 0) {
                    let msg = `🔍 *Found on FairPrice:*\n\n`;
                    products.forEach((p: any) => {
                        const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                        msg += `*${p.name}*\n💰 ₦${p.price.toLocaleString()}\n🔗 ${SITE}/product/${p.id}/${slug}\n\n`;
                    });
                    await WhatsAppService.sendMessage(from, msg);
                } else {
                    await WhatsAppService.sendMessage(from,
                        `Couldn't find a direct match for *"${text}"*.\n\n` +
                        `🔍 Search here: ${SITE}/search?q=${encodeURIComponent(text)}\n` +
                        `📸 Or send a photo to list it for sale!`
                    );
                }
            } catch {
                await WhatsAppService.sendMessage(from, `Browse our latest deals here:\n🔗 ${SITE}`);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("WhatsApp Webhook Error:", error);
        await db.whatsAppInteraction.create({
            data: { phoneNumber: "SYSTEM", interaction_type: "error", payload: `Webhook Error: ${error.message || "Unknown error"}` },
        }).catch(() => {});
        return NextResponse.json({ ok: true });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleCommand(from: string, text: string, contactName = "") {
    const parts   = text.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args    = parts.slice(1).join(" ");

    await db.whatsAppInteraction.create({
        data: { phoneNumber: from, interaction_type: "command", payload: JSON.stringify({ command, args, fullText: text }) },
    }).catch(() => {});

    if (command === "/price") {
        if (args) {
            await WhatsAppService.sendMessage(from,
                `🔍 Looking up verified market prices for *${args}*...\n\n` +
                `🔗 ${SITE}/search?q=${encodeURIComponent(args)}`
            );
        } else {
            await WhatsAppService.sendMessage(from,
                `What product do you want to check?\n\nUse: */price [product name]*\nExample: */price iPhone 15*`);
        }

    } else if (command === "/negotiate" || command === "/haggle") {
        if (!args) {
            await WhatsAppService.sendMessage(from,
                `Use: */negotiate [product name or link]*\n\n` +
                `Examples:\n` +
                `• */negotiate iPhone 15*\n` +
                `• */negotiate https://www.fairprice.ng/product/...*`
            );
        } else {
            // Check if args is a product URL — extract ID and negotiate directly
            const idMatch = args.match(/\/product\/([a-z0-9]+)/i);
            if (idMatch) {
                try {
                    const product = await db.product.findUnique({
                        where: { id: idMatch[1] },
                        select: { id: true, name: true, price: true, slug: true, sellerId: true },
                    });
                    if (product) {
                        await startWhatsAppNegotiation(from, product, contactName);
                    } else {
                        await WhatsAppService.sendMessage(from,
                            `Couldn't find that product. It may have been removed.\n\n🔗 Browse: ${SITE}`);
                    }
                } catch {
                    await WhatsAppService.sendMessage(from, `Had trouble looking that up. Please try again.`);
                }
            } else {
                // Search by name and present numbered list
                try {
                    const q = args.toLowerCase();
                    const tokens = q.split(/\s+/).filter((t: string) => t.length > 1);
                    const products = await db.product.findMany({
                        where: {
                            AND: tokens.map((t: string) => ({
                                OR: [
                                    { name: { contains: t, mode: "insensitive" as const } },
                                    { category: { contains: t, mode: "insensitive" as const } },
                                ],
                            })),
                            isActive: true,
                        },
                        take: 5,
                        select: { id: true, name: true, price: true, slug: true, sellerId: true },
                        orderBy: { createdAt: "desc" },
                    });

                    if (products.length === 0) {
                        await WhatsAppService.sendMessage(from,
                            `No products found for *"${args}"*.\n\n` +
                            `Try a different name, or browse the full catalogue:\n🔗 ${SITE}/search?q=${encodeURIComponent(args)}`
                        );
                    } else if (products.length === 1) {
                        // Only one match — start negotiation immediately
                        await startWhatsAppNegotiation(from, products[0]);
                    } else {
                        // Multiple matches — let user pick
                        await db.whatsAppInteraction.updateMany({
                            where: { phoneNumber: from, interaction_type: "zema_negotiate_choice" },
                            data: { interaction_type: "zema_negotiate_choice_expired" },
                        }).catch(() => {});

                        await db.whatsAppInteraction.create({ data: {
                            phoneNumber: from,
                            interaction_type: "zema_negotiate_choice",
                            payload: JSON.stringify({ products }),
                        }});

                        let msg = `🤝 *Found ${products.length} products matching "${args}":*\n\n`;
                        products.forEach((p, i) => {
                            msg += `*${i + 1}.* ${p.name}\n    💰 ₦${p.price.toLocaleString()}\n\n`;
                        });
                        msg += `Reply with the *number* (1–${products.length}) to start negotiating.`;
                        await WhatsAppService.sendMessage(from, msg);
                    }
                } catch {
                    await WhatsAppService.sendMessage(from,
                        `Had trouble searching. Browse and tap *Negotiate* on any product:\n🔗 ${SITE}`);
                }
            }
        }

    } else if (command === "/pay") {
        await WhatsAppService.sendCTALink(from,
            `💳 *Secure Checkout*\n\nPay safely with escrow protection — your money is held until you confirm delivery.`,
            "Go to Checkout",
            `${SITE}/checkout`);

    } else if (command === "/verify") {
        if (args) {
            try {
                const seller = await db.seller.findFirst({
                    where: {
                        OR: [
                            { id: args },
                            { storeUrl: { equals: args, mode: "insensitive" } },
                            { businessName: { contains: args, mode: "insensitive" } },
                        ],
                        status: "active",
                    },
                    select: { businessName: true, createdAt: true, storeUrl: true },
                });
                if (seller) {
                    const since = seller.createdAt.toLocaleDateString("en-NG", { year: "numeric", month: "long" });
                    await WhatsAppService.sendMessage(from,
                        `🛡️ *Trust Report: ${seller.businessName}*\n\n` +
                        `✅ Active FairPrice Seller\n` +
                        `📅 Member since: ${since}\n` +
                        `🔒 All payments are escrow-protected\n\n` +
                        `${seller.storeUrl ? `🏪 Store: ${SITE}/store/${seller.storeUrl}` : ""}`
                    );
                } else {
                    await WhatsAppService.sendMessage(from,
                        `Seller *${args}* not found or not active.\n\n` +
                        `🔍 Try their store URL or business name.\n` +
                        `🔗 Browse verified sellers: ${SITE}`
                    );
                }
            } catch {
                await WhatsAppService.sendMessage(from, `Had trouble checking that seller. Please try again.`);
            }
        } else {
            await WhatsAppService.sendMessage(from,
                `Use: */verify [seller name or store URL]*\nExample: */verify global-stores*`);
        }

    } else if (command === "/sell" || command === "/list") {
        await WhatsAppService.sendMessage(from,
            `📸 *Sell on FairPrice via WhatsApp*\n\n` +
            `Just send a product photo and ZEMA 360 AI will:\n` +
            `1️⃣ Analyse it with Qwen-VL\n` +
            `2️⃣ Generate title, description & category\n` +
            `3️⃣ Publish live on FairPrice in seconds\n\n` +
            `*Send your product photo to start!* 📷\n\n` +
            `Not registered yet?\n` +
            `👉 ${SITE}/seller/register\n\n` +
            `Already a seller? Manage your listings:\n` +
            `📦 ${SITE}/seller/dashboard`
        );

    } else if (command === "/help") {
        await WhatsAppService.sendMessage(from,
            `*FairPrice Commands* 🛍️\n\n` +
            `📸 *Send a photo* — List a product via AI (ZEMA 360)\n` +
            `*/price [item]* — Check real market price\n` +
            `*/negotiate [name or link]* — Haggle on a product\n` +
            `*/verify [seller]* — Check seller trust score\n` +
            `*/sell* — How to list your products\n` +
            `*/pay* — Go to checkout\n` +
            `*/payment* — Sellers: create a payment QR/link right here 💳\n` +
            `*/help* — Show this menu\n\n` +
            `─────────────────\n` +
            `🛍️ *Browse:* ${SITE}\n` +
            `🏪 *Become a seller:* ${SITE}/seller/register\n` +
            `📦 *Seller dashboard:* ${SITE}/seller/dashboard\n` +
            `📞 *Support:* ${SITE}/support`
        );

    } else {
        await WhatsAppService.sendMessage(from,
            `Unknown command. Type */help* to see all available commands.`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ICEBREAKER HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleIceBreaker(from: string, text: string) {
    await db.whatsAppInteraction.create({
        data: { phoneNumber: from, interaction_type: "ice_breaker", payload: JSON.stringify({ iceBreaker: text }) },
    }).catch(() => {});

    if (text === "Check Real Market Price") {
        await WhatsAppService.sendMessage(from,
            `Welcome to FairPrice! ZIVA AI ensures you buy & sell with no wahala. 🛡️\n\nReply with */price [product name]* or search directly:\n🔗 ${SITE}/search`);
    } else if (text === "How much last? Let's bargain") {
        await WhatsAppService.sendMessage(from,
            `Our sellers are open to offers! Browse products and tap the 🤝 *Negotiate* button, or send a product link with */haggle [url]*:\n🔗 ${SITE}`);
    } else if (text === "Apply for Financing") {
        await WhatsAppService.sendMessage(from,
            "Want to Buy Now, Pay Later? Reply with your registered email address to check your financing eligibility.");
    } else if (text === "Help import or source a product") {
        await WhatsAppService.sendMessage(from,
            `Our global sourcing team can help you import safely using FairPrice Escrow.\n\nReply with the product name or a link and an agent will assist you.\n🔗 ${SITE}/support`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLER DIRECT REPLY (negotiation)
// ─────────────────────────────────────────────────────────────────────────────
async function handleSellerDirectReply(from: string, text: string, session: any) {
    const upperText = text.toUpperCase();
    const negotiationId = session.negotiationId;

    const negotiation = await db.negotiationRequest.findUnique({
        where: { id: negotiationId },
        include: { product: true },
    });
    if (!negotiation) return;

    if (upperText === "ACCEPT") {
        await db.negotiationRequest.update({ where: { id: negotiationId }, data: { status: "accepted" } });
        await WhatsAppService.sendMessage(from, `✅ You accepted the offer for *${negotiation.product.name}*. Customer notified to complete payment.`);
        if (session.customerPhone) {
            const agreedPrice = negotiation.proposedPrice;
            const prod = negotiation.product as any;
            const checkoutParams = new URLSearchParams({
                productId: prod.id,
                name:      prod.name,
                amount:    String(Math.round(agreedPrice)),
                sellerId:  negotiation.sellerId,
                category:  prod.category || "general",
                ...(prod.imageUrl ? { image: prod.imageUrl } : {}),
            });
            await WhatsAppService.sendCTALink(session.customerPhone,
                `🎉 *Deal accepted!*\n\nYour offer for *${prod.name}* at ₦${agreedPrice.toLocaleString()} was accepted by the seller! Tap below to pay safely via FairPrice Escrow.`,
                "Complete Payment Now", `${SITE}/checkout/direct?${checkoutParams.toString()}`);
        }
    } else if (upperText === "REJECT") {
        await db.negotiationRequest.update({ where: { id: negotiationId }, data: { status: "rejected" } });
        await WhatsAppService.sendMessage(from, `❌ Offer for *${negotiation.product.name}* rejected.`);
        if (session.customerPhone) {
            await WhatsAppService.sendMessage(session.customerPhone,
                `😔 The seller declined your offer for *${negotiation.product.name}*. Try searching for other deals:\n🔗 ${SITE}`);
        }
    } else if (upperText.startsWith("COUNTER")) {
        const counterArg = text.replace(/^counter/i, "").trim();
        const counterPrice = parsePriceReply(counterArg);
        if (counterPrice !== null && counterPrice > 0) {
            await db.negotiationRequest.update({ where: { id: negotiationId }, data: { counterPrice, status: "countered" } });
            await WhatsAppService.sendMessage(from, `📤 Counter-offer of *₦${counterPrice.toLocaleString()}* sent to the customer.`);
            if (session.customerPhone) {
                await WhatsAppService.sendNegotiationUpdate(session.customerPhone, {
                    productName: negotiation.product.name,
                    newPrice: counterPrice,
                    sellerName: "The Seller",
                    negotiationId: negotiation.id,
                });
            }
        } else {
            await WhatsAppService.sendMessage(from, "⚠️ Invalid counter format. Use: `counter 50000`");
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// START WHATSAPP NEGOTIATION
// Upserts a guest User for the WhatsApp number, then creates a NegotiationRequest.
// Follows the same guest-upsert pattern as /api/negotiations.
// ─────────────────────────────────────────────────────────────────────────────
async function startWhatsAppNegotiation(
    from: string,
    product: { id: string; name: string; price: number; slug: string | null; sellerId: string },
    contactName?: string
) {
    if (!from?.trim()) return;
    const displayName = contactName?.trim() || "WhatsApp Buyer";
    // Canonical format is wa_<phone>@fairprice.ng (underscore) — matches every other
    // WhatsApp-derived account creation path (register, bulk-import, status). This
    // function used a dash instead, with no check for an existing underscore account,
    // so a customer who already had a wa_ account (e.g. from bulk-import) got a second,
    // completely separate wa- account the moment they started a WhatsApp negotiation —
    // splitting their order/negotiation history across two identities.
    const waEmail = `wa_${from}@fairprice.ng`;
    const existing = await db.user.findFirst({
        where: { email: { in: [waEmail, `wa-${from}@fairprice.ng`] } },
    });
    const waUser = existing
        ? await db.user.update({
            where: { id: existing.id },
            data: contactName ? { name: displayName } : {},
        })
        : await db.user.create({
            data: { email: waEmail, name: displayName, role: "customer" },
        });

    const proposed = Math.round(product.price * 0.9);
    // Store phone in digits-only format so all query variants match
    const normalizedBuyerPhone = WhatsAppService.normalizePhoneNumber(from);

    const neg = await db.negotiationRequest.create({
        data: {
            productId:        product.id,
            customerId:       waUser.id,
            customerName:     displayName,
            sellerId:         product.sellerId,
            proposedPrice:    proposed,
            status:           "pending",
            customerWhatsapp: normalizedBuyerPhone,
        } as any,
    });

    await WhatsAppService.sendCTALink(
        from,
        `🤝 *Negotiation started!*\n\n📦 *${product.name}*\n💰 Listed: ₦${product.price.toLocaleString()}\n📩 Your opening offer: ₦${proposed.toLocaleString()} (10% off)\n\nThe seller has been notified. Reply with any price to counter (e.g. *${Math.round(product.price * 0.85).toLocaleString()}*), or wait for their response.`,
        "View Product",
        `${SITE}/product/${product.id}/${product.slug || ""}`
    );

    // Notify seller via WhatsApp and create a session so their ACCEPT/REJECT/COUNTER works
    try {
        const seller = await db.seller.findUnique({
            where: { id: product.sellerId },
            select: { whatsappNumber: true, businessName: true },
        });
        if (seller?.whatsappNumber) {
            const normalizedSellerPhone = WhatsAppService.normalizePhoneNumber(seller.whatsappNumber);
            await WhatsAppService.sendMessage(seller.whatsappNumber,
                `🤝 *New negotiation on FairPrice!*\n\n` +
                `📦 ${product.name}\n` +
                `💰 Listed: ₦${product.price.toLocaleString()}\n` +
                `📩 Buyer offers: ₦${proposed.toLocaleString()}\n\n` +
                `Reply *ACCEPT*, *REJECT*, or *COUNTER [price]* to respond.\n` +
                `Negotiation ID: ${neg.id}`
            );
            // Create/upsert seller session so their next reply is routed correctly
            if (normalizedSellerPhone) {
                await db.whatsAppNegotiationSession.upsert({
                    where: { sellerPhone_negotiationId: { sellerPhone: normalizedSellerPhone, negotiationId: neg.id } },
                    update: { updatedAt: new Date(), customerPhone: normalizedBuyerPhone },
                    create: {
                        sellerId:      product.sellerId,
                        negotiationId: neg.id,
                        sellerPhone:   normalizedSellerPhone,
                        customerPhone: normalizedBuyerPhone,
                    },
                });
            }
        }
    } catch { /* seller notification is best-effort */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZEMA 360 — SELLER PAYMENT QR/LINK FLOW
//
// A seller messages "payment" (or /payment) and gets, entirely inside WhatsApp,
// the same payment QR + link the dashboard's FairPay generator produces:
//
//   payment → [not linked yet?] seller email → OTP (emailed) → linked forever
//           → "what's it for?" → amount → QR image + tap-to-pay link
//
// Verification is ONE-TIME: on OTP success the sender's WhatsApp number is
// saved on the Seller record, so every future "payment" skips straight to the
// label/amount questions. The generated link is the exact /checkout/direct
// format the dashboard QR uses, so scanning it enters the existing
// QR → Paystack webhook → auto-payout / WhatsApp-HITL pipeline unchanged.
//
// Session state lives in WhatsAppInteraction rows (interaction_type
// "wa_pay_session"), the same pattern as the photo-listing draft flow.
// Sessions idle >30 min are ignored; typing "cancel" aborts.
// ─────────────────────────────────────────────────────────────────────────────

const PAY_SESSION_TYPE = "wa_pay_session";
const PAY_SESSION_TTL_MS = 30 * 60 * 1000;

function payPhoneVariants(normalizedFrom: string): string[] {
    const digits = normalizedFrom.replace(/\D/g, "");
    const variants = new Set<string>([digits, `+${digits}`]);
    if (digits.startsWith("234")) variants.add(`0${digits.slice(3)}`);
    return [...variants];
}

async function findLinkedSeller(normalizedFrom: string) {
    const variants = payPhoneVariants(normalizedFrom);
    // Directly linked seller (set by this flow or by dashboard settings)
    let seller = await db.seller.findFirst({
        where: { whatsappNumber: { in: variants } },
        select: { id: true, businessName: true, storeUrl: true, logoUrl: true },
    });
    if (seller) return seller;
    // Fallback: user record linked to this number who owns a store
    const waUser = await db.user.findFirst({
        where: { whatsappNumber: { in: variants } },
        select: { id: true },
    });
    if (waUser) {
        seller = await db.seller.findFirst({
            where: { userId: waUser.id },
            select: { id: true, businessName: true, storeUrl: true, logoUrl: true },
        });
    }
    return seller;
}

async function expirePaySessions(from: string) {
    await db.whatsAppInteraction.updateMany({
        where: { phoneNumber: from, interaction_type: PAY_SESSION_TYPE },
        data: { interaction_type: `${PAY_SESSION_TYPE}_done` },
    }).catch(() => {});
}

async function createPaySession(from: string, payload: Record<string, any>) {
    await expirePaySessions(from);
    await db.whatsAppInteraction.create({
        data: { phoneNumber: from, interaction_type: PAY_SESSION_TYPE, payload: JSON.stringify(payload) },
    });
}

async function startPaymentFlow(from: string, normalizedFrom: string) {
    const seller = await findLinkedSeller(normalizedFrom);

    if (seller) {
        await createPaySession(from, { step: "label", sellerId: seller.id });
        await WhatsAppService.sendMessage(from,
            `💳 *FairPay — New Payment* (${seller.businessName})\n\n` +
            `What is this payment for?\n` +
            `_e.g. "Jollof + 1 meat" or "Ankara fabric x2"_\n\n` +
            `Type *cancel* anytime to stop.`
        );
        return;
    }

    await createPaySession(from, { step: "email" });
    await WhatsAppService.sendMessage(from,
        `💳 *FairPay — Seller Verification*\n\n` +
        `This WhatsApp number isn't linked to a FairPrice seller account yet. ` +
        `This is a ONE-TIME step — after verifying, just type *payment* and go.\n\n` +
        `👉 Reply with your *seller account email* to begin.\n\n` +
        `Not a seller yet? Register free: ${SITE}/seller/register`
    );
}

async function handlePaymentSession(from: string, normalizedFrom: string, text: string): Promise<boolean> {
    const session = await db.whatsAppInteraction.findFirst({
        where: { phoneNumber: from, interaction_type: PAY_SESSION_TYPE },
        orderBy: { createdAt: "desc" },
    });
    if (!session) return false;

    if (Date.now() - new Date(session.createdAt).getTime() > PAY_SESSION_TTL_MS) {
        await expirePaySessions(from);
        return false; // stale — let the message fall through to normal handling
    }

    const state = JSON.parse(session.payload || "{}");
    const reply = text.trim();

    if (reply.toLowerCase() === "cancel" || reply.toLowerCase() === "stop") {
        await expirePaySessions(from);
        await WhatsAppService.sendMessage(from, `❌ Payment setup cancelled. Type *payment* to start again.`);
        return true;
    }

    // ── Step 1: seller email ──────────────────────────────────────────────
    if (state.step === "email") {
        const email = reply.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            await WhatsAppService.sendMessage(from, `That doesn't look like an email address. Please reply with your seller account email, or *cancel*.`);
            return true;
        }

        let seller = await db.seller.findFirst({
            where: { ownerEmail: { equals: email, mode: "insensitive" } },
            select: { id: true, businessName: true, ownerEmail: true },
        });
        if (!seller) {
            const emailUser = await db.user.findFirst({
                where: { email: { equals: email, mode: "insensitive" } },
                select: { id: true },
            });
            if (emailUser) {
                seller = await db.seller.findFirst({
                    where: { userId: emailUser.id },
                    select: { id: true, businessName: true, ownerEmail: true },
                });
            }
        }
        if (!seller) {
            await WhatsAppService.sendMessage(from,
                `No seller account found for *${email}*.\n\n` +
                `Double-check the email, or register free: ${SITE}/seller/register\n\n` +
                `Reply with another email, or *cancel*.`
            );
            return true;
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await createPaySession(from, { step: "otp", sellerId: seller.id, email, otp, attempts: 0 });

        await fetch(`${SITE}/api/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: email,
                type: "VERIFY_EMAIL",
                payload: { name: seller.businessName, code: otp },
            }),
        }).catch(() => {});

        await WhatsAppService.sendMessage(from,
            `📧 We've sent a 6-digit code to *${email}*.\n\n` +
            `Reply with the code to link this WhatsApp number to *${seller.businessName}* — one time only.`
        );
        return true;
    }

    // ── Step 2: OTP ───────────────────────────────────────────────────────
    if (state.step === "otp") {
        const code = reply.replace(/\D/g, "");
        if (code !== state.otp) {
            const attempts = (state.attempts || 0) + 1;
            if (attempts >= 5) {
                await expirePaySessions(from);
                await WhatsAppService.sendMessage(from, `Too many incorrect codes. Type *payment* to start over.`);
                return true;
            }
            await createPaySession(from, { ...state, attempts });
            await WhatsAppService.sendMessage(from, `That code doesn't match (${5 - attempts} tries left). Check the email we sent to *${state.email}* and reply with the 6-digit code.`);
            return true;
        }

        // Verified — durably link this WhatsApp number to the seller account.
        const digits = normalizedFrom.replace(/\D/g, "");
        await db.seller.update({ where: { id: state.sellerId }, data: { whatsappNumber: digits } }).catch(() => {});

        const seller = await db.seller.findUnique({ where: { id: state.sellerId }, select: { businessName: true } });
        await createPaySession(from, { step: "label", sellerId: state.sellerId });
        await WhatsAppService.sendMessage(from,
            `✅ *Verified!* This number is now linked to *${seller?.businessName || "your store"}* — you won't need to do this again.\n\n` +
            `💳 What is this payment for?\n_e.g. "Jollof + 1 meat"_`
        );
        return true;
    }

    // ── Step 3: label ─────────────────────────────────────────────────────
    if (state.step === "label") {
        if (reply.length < 2) {
            await WhatsAppService.sendMessage(from, `Please describe what the payment is for (e.g. "Jollof + 1 meat"), or *cancel*.`);
            return true;
        }
        await createPaySession(from, { ...state, step: "amount", label: reply });
        await WhatsAppService.sendMessage(from,
            `💰 How much is *${reply}*?\n\n` +
            `Reply with the amount in Naira (e.g. *3000*), or *open* to let the customer browse your store and pay any amount.`
        );
        return true;
    }

    // ── Step 4: amount → generate & send QR + link ────────────────────────
    if (state.step === "amount") {
        const seller = await db.seller.findUnique({
            where: { id: state.sellerId },
            select: { id: true, businessName: true, storeUrl: true, logoUrl: true },
        });
        if (!seller) {
            await expirePaySessions(from);
            await WhatsAppService.sendMessage(from, `Something went wrong finding your store. Type *payment* to start again.`);
            return true;
        }

        let paymentLink: string;
        let summary: string;
        let fixedAmount: number | null = null;
        if (reply.toLowerCase() === "open") {
            paymentLink = `${SITE}/store/${seller.storeUrl || seller.id}`;
            summary = `Open amount — customers browse *${seller.businessName}* and pay for what they pick.`;
        } else {
            const amount = Math.round(parseFloat(reply.replace(/[^0-9.]/g, "")));
            if (isNaN(amount) || amount < 50) {
                await WhatsAppService.sendMessage(from, `Please reply with a valid amount in Naira (e.g. *3000*), *open*, or *cancel*.`);
                return true;
            }
            fixedAmount = amount;
            const params = new URLSearchParams({
                sellerId: seller.id,
                amount: String(amount),
                label: state.label || `Payment to ${seller.businessName}`,
                ...(seller.logoUrl ? { image: seller.logoUrl } : {}),
            });
            paymentLink = `${SITE}/checkout/direct?${params.toString()}`;
            summary = `*${state.label}* — ₦${amount.toLocaleString()}`;
        }

        // Fixed-amount payments can additionally get a one-time bank account
        // (Pay-with-Transfer) — keep a short session alive so "transfer" works.
        if (fixedAmount) {
            await createPaySession(from, { step: "post", sellerId: seller.id, label: state.label, amount: fixedAmount });
        } else {
            await expirePaySessions(from);
        }

        // QR image (public QR renderer encoding the same link, like the dashboard QR)
        const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(paymentLink)}&size=500&margin=2&ecLevel=H`;
        await WhatsAppService.sendImage(from, qrUrl,
            `💳 FairPay QR — ${state.label || seller.businessName}\nScan to pay securely via FairPrice.`);

        await WhatsAppService.sendCTALink(from,
            `✅ *Payment link ready!*\n\n${summary}\n\n` +
            `Forward the QR above or share this link with your customer. ` +
            `Money lands per your payout settings the moment they pay — you'll be notified here and on your dashboard.\n\n` +
            (fixedAmount ? `🏦 Prefer a bank transfer? Reply *transfer* to get a one-time account number for this exact amount (valid ~30 minutes).\n\n` : "") +
            `Type *payment* anytime to create another.`,
            "Open Payment Link", paymentLink);

        await db.whatsAppInteraction.create({
            data: { phoneNumber: from, interaction_type: "wa_pay_link_generated", payload: JSON.stringify({ sellerId: seller.id, label: state.label, link: paymentLink }) },
        }).catch(() => {});
        return true;
    }

    // ── Step 5 (optional): one-time bank transfer account for this payment ──
    if (state.step === "post") {
        if (reply.toLowerCase() !== "transfer") {
            // Not asking for a transfer account — end the session quietly and let
            // this message flow through normal handling (search, greeting, etc.).
            await expirePaySessions(from);
            return false;
        }

        const seller = await db.seller.findUnique({
            where: { id: state.sellerId },
            select: { id: true, businessName: true, ownerEmail: true },
        });
        await expirePaySessions(from);
        if (!seller || !state.amount) {
            await WhatsAppService.sendMessage(from, `Couldn't create a transfer account for that payment. Type *payment* to start again.`);
            return true;
        }

        const { createPayWithTransferCharge } = await import("@/lib/payout-transfer");
        const pwt = await createPayWithTransferCharge({
            sellerId: seller.id,
            amountNaira: state.amount,
            label: state.label || `Payment to ${seller.businessName}`,
            customerEmail: seller.ownerEmail || `${seller.id}@fairprice.ng`,
        });

        if (!pwt.success) {
            await WhatsAppService.sendMessage(from,
                `🏦 Transfer accounts aren't enabled on our payment processor yet (${pwt.message || "unavailable"}).\n\n` +
                `Your QR and payment link above still work perfectly — customers can pick "Transfer" inside the payment page for the same result.`
            );
            return true;
        }

        const expiryNote = pwt.expiresAt
            ? new Date(pwt.expiresAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
            : null;
        await WhatsAppService.sendMessage(from,
            `🏦 *One-Time Transfer Account*\n\n` +
            `${state.label} — *₦${state.amount.toLocaleString()}*\n\n` +
            `Bank: *${pwt.bankName}*\n` +
            `Account: *${pwt.accountNumber}*\n` +
            `Name: ${pwt.accountName}\n` +
            (expiryNote ? `⏰ Valid until ~${expiryNote}\n` : `⏰ Valid ~30 minutes\n`) +
            `\nForward this to your customer. It only accepts EXACTLY ₦${state.amount.toLocaleString()} — the moment it lands you'll be notified here and it reflects on your dashboard with your usual payout settings.`
        );

        await db.whatsAppInteraction.create({
            data: { phoneNumber: from, interaction_type: "wa_pay_pwt_generated", payload: JSON.stringify({ sellerId: seller.id, label: state.label, amount: state.amount, reference: pwt.reference }) },
        }).catch(() => {});
        return true;
    }

    return false;
}
