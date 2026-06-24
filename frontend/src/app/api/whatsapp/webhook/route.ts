import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { put } from "@vercel/blob";

// Always link to the production domain in WhatsApp messages — never a Vercel preview URL.
// Override with FAIRPRICE_URL env var if needed.
const SITE = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";

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

        const from = message.from;
        // Guard: ignore malformed messages with no sender phone number
        if (!from || !from.trim()) return NextResponse.json({ ok: true });

        // WhatsApp profile name from the contacts array (the sender's WA display name)
        const contactName: string = value?.contacts?.[0]?.profile?.name || "";

        // If WA sent us a real name, update any existing user matched by whatsappNumber —
        // this covers bulk-imported users (wa_) who still show as "WhatsApp User"
        if (contactName) {
            db.user.updateMany({
                where: {
                    whatsappNumber: from,
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

                    await db.whatsAppInteraction.create({ data: {
                        phoneNumber: from,
                        interaction_type: "zema_listing_draft",
                        payload: JSON.stringify({
                            status: "awaiting_price",
                            listing,
                            imageUrl: dataUrl,
                            mediaId: message.image.id,
                        }),
                    }});

                    const priceHint = listing.price_ngn
                        ? `\n💡 ZEMA suggests ≈ ₦${listing.price_ngn.toLocaleString()}` : "";

                    await WhatsAppService.sendMessage(from,
                        `✅ *ZEMA 360 — Product Analysed*\n\n` +
                        `📦 *${listing.title}*\n` +
                        `📂 ${listing.category}  |  🏷️ ${listing.condition}${priceHint}\n\n` +
                        `📝 ${listing.description}\n\n` +
                        `🔖 Tags: ${(listing.tags || []).join(", ")}\n` +
                        `🎯 Confidence: ${Math.round((listing.confidence || 0) * 100)}%\n\n` +
                        `*Reply with your asking price* (numbers only, e.g. *45000*) to continue listing this on FairPrice.ng ↓`
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
                imageUrl: string; price?: number;
            };

            if (draft.status === "awaiting_price") {
                const price = parseFloat(text.replace(/[^0-9.]/g, ""));
                if (!isNaN(price) && price > 100) {
                    await db.whatsAppInteraction.update({
                        where: { id: activeDraftRow.id },
                        data: { payload: JSON.stringify({ ...draft, status: "awaiting_confirm", price }) },
                    });
                    const l = draft.listing as { title: string; category: string; condition: string; description: string };
                    await WhatsAppService.sendMessage(from,
                        `📋 *Confirm your listing*\n\n` +
                        `📦 *${l.title}*\n` +
                        `💰 Price: ₦${price.toLocaleString()}\n` +
                        `📂 ${l.category}  |  🏷️ ${l.condition}\n` +
                        `📝 ${l.description}\n\n` +
                        `Reply *YES* to publish live on FairPrice.ng, or *CANCEL* to start over.`
                    );
                } else {
                    await WhatsAppService.sendMessage(from,
                        "⚠️ That doesn't look like a valid price. Reply with just the number (e.g. *45000*).");
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
                        const fromDigits10 = from.replace(/\D/g, "").slice(-10);
                        let seller = await db.seller.findFirst({
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
                            subcategory: l.category.includes("|") ? l.category.split("|")[1].trim() : undefined,
                            imageUrl:    draft.imageUrl,
                            images:      [draft.imageUrl],
                            tags:        l.tags || [],
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
                    // Resolve by short code (preferred) OR the underlying cuid (backward compat).
                    const request = await db.zemaApprovalRequest.findFirst({
                        where: { OR: [{ code: approvalId }, { code: approvalId.toUpperCase() }, { id: approvalId }] },
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
                    if (decision === "approved") {
                        const agentData = JSON.parse(request.agentDecision || "{}");
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
        // COMMANDS
        // ─────────────────────────────────────────────────────────────────────
        if (text.startsWith("/")) {
            await handleCommand(from, text, contactName);
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
            const price = parseFloat(text.replace(/[^0-9.,]/g, "").replace(/,/g, ""));
            if (!isNaN(price) && price > 100) {
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
        const counterPrice = parseFloat(text.replace(/[^0-9]/g, ""));
        if (!isNaN(counterPrice) && counterPrice > 0) {
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
    const waEmail = `wa-${from}@fairprice.ng`;
    const waUser = await db.user.upsert({
        where: { email: waEmail },
        update: contactName ? { name: displayName } : {},
        create: { email: waEmail, name: displayName, role: "customer" },
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
