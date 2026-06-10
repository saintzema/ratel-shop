import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * GET handler for WhatsApp Webhook verification (Meta verification challenge)
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Replace 'fairprice_verify_token' with process.env.WHATSAPP_VERIFY_TOKEN in production
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "fairprice_verify_token";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
}

/**
 * POST handler for incoming WhatsApp messages
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (!message) return NextResponse.json({ ok: true });

        const from = message.from;
        const text = message.text?.body?.trim() 
                  || message.interactive?.button_reply?.title?.trim() 
                  || message.interactive?.list_reply?.title?.trim() 
                  || message.button?.text?.trim() 
                  || "";

        // ─────────────────────────────────────────────────────────────────────────
        // ZEMA 360 — WhatsApp Seller Listing Flow (Photo → Listing → Live Product)
        //
        // Conversation state machine stored in WhatsAppInteraction records:
        //   Step 1 (image message)  → analyse with Qwen-VL, save draft, ask for price
        //   Step 2 (price reply)    → update draft, confirm listing details
        //   Step 3 ("YES"/"CONFIRM")→ create product in DB, send live product URL
        // ─────────────────────────────────────────────────────────────────────────

        const FC_URL   = process.env.ZEMA_FC_URL   || 'https://zema-api-nceagrcrdd.ap-southeast-1.fcapp.run';
        const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
        const APP_URL  = process.env.NEXTAUTH_URL   || 'https://www.fairprice.ng';

        // ── Step 1: Image received → Qwen-VL analysis ─────────────────────────
        if (message.type === 'image' && message.image?.id) {
            await WhatsAppService.sendMessage(from,
                '🤖 *ZEMA 360 scanning your product photo...*\n_Powered by Qwen-VL · Alibaba Cloud_'
            );
            try {
                // Resolve + download WhatsApp media (auth required)
                const metaRes   = await fetch(`https://graph.facebook.com/v18.0/${message.image.id}`,
                    { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
                const metaJson  = await metaRes.json() as { url: string; mime_type?: string };
                const mimeType  = metaJson.mime_type || 'image/jpeg';
                const imgRes    = await fetch(metaJson.url, { headers: { Authorization: `Bearer ${WA_TOKEN}` } });
                const base64    = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
                const dataUrl   = `data:${mimeType};base64,${base64}`;

                // Call FC → Qwen-VL
                const ingestRes  = await fetch(`${FC_URL}/api/v1/zema/ingest`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body:   JSON.stringify({ seller_id: from, image_urls: [dataUrl] }),
                    signal: AbortSignal.timeout(55_000),
                });
                const { listing } = await ingestRes.json() as {
                    listing?: { title: string; category: string; condition: string;
                                price_ngn: number | null; description: string;
                                tags: string[]; confidence: number };
                };

                if (listing?.title) {
                    // Cancel any previous in-progress draft for this number
                    await db.whatsAppInteraction.updateMany({
                        where: { phoneNumber: from, interaction_type: 'zema_listing_draft' },
                        data:  { interaction_type: 'zema_listing_draft_expired' }
                    }).catch(() => {});

                    // Save new draft session
                    await db.whatsAppInteraction.create({ data: {
                        phoneNumber: from,
                        interaction_type: 'zema_listing_draft',
                        payload: JSON.stringify({
                            status:   'awaiting_price',
                            listing,
                            imageUrl: dataUrl,      // stored as base64; becomes product imageUrl
                            mediaId:  message.image.id,
                        })
                    }});

                    const priceHint = listing.price_ngn
                        ? `\n💡 ZEMA suggests ≈ ₦${listing.price_ngn.toLocaleString()}` : '';
                    await WhatsAppService.sendMessage(from,
                        `✅ *ZEMA 360 — Product Analysed*\n\n` +
                        `📦 *${listing.title}*\n` +
                        `📂 ${listing.category}  |  🏷️ ${listing.condition}${priceHint}\n\n` +
                        `📝 ${listing.description}\n\n` +
                        `🔖 Tags: ${(listing.tags || []).join(', ')}\n` +
                        `🎯 Confidence: ${Math.round((listing.confidence || 0) * 100)}%\n\n` +
                        `*Reply with your asking price* (numbers only, e.g. *45000*) to continue listing this on FairPrice.ng ↓`
                    );
                } else {
                    await WhatsAppService.sendMessage(from,
                        `⚠️ ZEMA couldn't read that image clearly.\n\nPlease send a well-lit, close-up photo against a plain background.`);
                }
            } catch (err: unknown) {
                console.error('[ZEMA Ingest WhatsApp]', err instanceof Error ? err.message : err);
                await WhatsAppService.sendMessage(from, `⚠️ ZEMA image scan hit a snag. Please try again in a moment.`);
            }
            return NextResponse.json({ ok: true });
        }

        if (!text && !message.interactive) return NextResponse.json({ ok: true });

        // ── Steps 2 & 3: Continue an active listing draft ─────────────────────
        const activeDraftRow = await db.whatsAppInteraction.findFirst({
            where: { phoneNumber: from, interaction_type: 'zema_listing_draft' },
            orderBy: { createdAt: 'desc' },
        });
        if (activeDraftRow?.payload) {
            const draft = JSON.parse(activeDraftRow.payload) as {
                status: string; listing: Record<string, unknown>;
                imageUrl: string; price?: number;
            };

            // ── Step 2: seller replies with their asking price ─────────────────
            if (draft.status === 'awaiting_price') {
                const price = parseFloat(text.replace(/[^0-9.]/g, ''));
                if (!isNaN(price) && price > 100) {
                    // Update draft with price, move to awaiting_confirm
                    await db.whatsAppInteraction.update({
                        where: { id: activeDraftRow.id },
                        data:  { payload: JSON.stringify({ ...draft, status: 'awaiting_confirm', price }) }
                    });
                    const l = draft.listing as { title: string; category: string; condition: string; description: string; tags: string[] };
                    await WhatsAppService.sendMessage(from,
                        `📋 *Confirm your listing*\n\n` +
                        `📦 *${l.title}*\n` +
                        `💰 Price: ₦${price.toLocaleString()}\n` +
                        `📂 ${l.category}  |  🏷️ ${l.condition}\n` +
                        `📝 ${l.description}\n\n` +
                        `Reply *YES* to publish this live on FairPrice.ng now, or *CANCEL* to start over.`
                    );
                    return NextResponse.json({ ok: true });
                } else {
                    await WhatsAppService.sendMessage(from,
                        `⚠️ That doesn't look like a valid price. Reply with just the number (e.g. *45000*).`);
                    return NextResponse.json({ ok: true });
                }
            }

            // ── Step 3: seller confirms → create product in DB ─────────────────
            if (draft.status === 'awaiting_confirm') {
                const upper = text.toUpperCase().trim();

                if (upper === 'CANCEL' || upper === 'NO') {
                    await db.whatsAppInteraction.update({
                        where: { id: activeDraftRow.id },
                        data:  { interaction_type: 'zema_listing_draft_cancelled' }
                    });
                    await WhatsAppService.sendMessage(from,
                        `Listing cancelled. Send a new product photo whenever you're ready.`);
                    return NextResponse.json({ ok: true });
                }

                if (upper === 'YES' || upper === 'CONFIRM') {
                    try {
                        // Look up seller by WhatsApp number (normalised)
                        const normalised = from.startsWith('+') ? from : `+${from}`;
                        const user = await db.user.findFirst({
                            where: { OR: [{ whatsappNumber: normalised }, { whatsappNumber: from }] },
                            include: { sellers: { where: { status: 'active' }, take: 1 } }
                        });
                        const seller = user?.sellers?.[0];

                        if (!seller) {
                            await WhatsAppService.sendMessage(from,
                                `⚠️ We couldn't find a FairPrice seller account linked to this number.\n\n` +
                                `Please visit *${APP_URL}/seller/register* to create your account, then try again.`);
                            return NextResponse.json({ ok: true });
                        }

                        const l = draft.listing as {
                            title: string; category: string; condition: string;
                            description: string; tags: string[];
                        };

                        // Map Qwen condition → Prisma enum
                        const conditionMap: Record<string, 'brand_new' | 'used' | 'refurbished'> = {
                            new:          'brand_new',
                            fairly_used:  'refurbished',
                            used:         'used',
                        };
                        const condition = conditionMap[l.condition as string] ?? 'used';

                        // Generate slug
                        const slug = (l.title || 'product')
                            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

                        const product = await db.product.create({ data: {
                            sellerId:     seller.id,
                            sellerName:   seller.businessName,
                            name:         l.title,
                            description:  l.description,
                            price:        draft.price!,
                            category:     l.category.split('|')[0].trim(),
                            subcategory:  l.category.includes('|') ? l.category.split('|')[1].trim() : undefined,
                            imageUrl:     draft.imageUrl,   // base64 data URL
                            images:       [draft.imageUrl],
                            tags:         l.tags || [],
                            condition,
                            slug,
                            stock:        1,
                            isActive:     true,
                        }});

                        // Mark draft completed
                        await db.whatsAppInteraction.update({
                            where: { id: activeDraftRow.id },
                            data:  { interaction_type: 'zema_listing_completed',
                                     payload: JSON.stringify({ ...draft, status: 'completed', productId: product.id }) }
                        });

                        const productUrl = `${APP_URL}/product/${product.id}/${slug}`;
                        await WhatsAppService.sendMessage(from,
                            `🎉 *Your product is LIVE on FairPrice.ng!*\n\n` +
                            `📦 *${l.title}*\n` +
                            `💰 ₦${draft.price!.toLocaleString()}\n\n` +
                            `🔗 View & share your listing:\n${productUrl}\n\n` +
                            `Buyers can order and pay into escrow right now. You'll be notified when an order comes in. 🚀`
                        );
                    } catch (createErr: unknown) {
                        console.error('[ZEMA CreateProduct]', createErr instanceof Error ? createErr.message : createErr);
                        await WhatsAppService.sendMessage(from,
                            `⚠️ Something went wrong creating your listing. Our team has been notified. Please try again or visit ${APP_URL}/seller.`);
                    }
                    return NextResponse.json({ ok: true });
                }
                // Any other reply during awaiting_confirm — remind them
                await WhatsAppService.sendMessage(from,
                    `Reply *YES* to publish your listing, or *CANCEL* to start over.`);
                return NextResponse.json({ ok: true });
            }
        }

        // --- 1. ADMIN VISIBILITY: Log Interaction ---
        await db.whatsAppInteraction.create({
            data: {
                phoneNumber: from,
                interaction_type: "inbound_message",
                payload: JSON.stringify({
                    text,
                    raw: message,
                    timestamp: new Date().toISOString()
                })
            }
        }).catch((e: any) => console.error("Failed to log interaction:", e));

        const normalizedFrom = WhatsAppService.normalizePhoneNumber(from);

        // --- 2. LOGIN VERIFICATION ---
        if (text.toLowerCase().startsWith("verify fairprice:")) {
            const code = text.split(":")[1]?.trim();
            if (code) {
                const verification = await db.whatsAppVerification.findUnique({ where: { code } });
                if (verification && new Date() < verification.expiresAt) {
                    await db.whatsAppVerification.update({
                        where: { id: verification.id },
                        data: { status: "verified" }
                    });
                    const APP_URL = process.env.NEXTAUTH_URL || "https://www.fairprice.ng";
                    await WhatsAppService.sendMessage(from, `✅ *Verified!* Your account is now securely linked to WhatsApp.\n\n🔗 *Back to FairPrice:* ${APP_URL}/login?wa_code=${code}`);
                    return NextResponse.json({ ok: true });
                }
            }
        }

        // --- 2.5. ZEMA 360 HITL APPROVAL (approve / reject <runId>-approval) ---
        // The ZEMA approver number (+2348162816305 or normalised variant) sends
        // "approve <id>" or "reject <id>" to resume a paused agent pipeline.
        const ZEMA_APPROVER = (process.env.ZEMA_APPROVER_WHATSAPP || "+2348162816305").replace(/\D/g, "");
        const fromDigits = from.replace(/\D/g, "");
        const isApprover = fromDigits.endsWith(ZEMA_APPROVER) || ZEMA_APPROVER.endsWith(fromDigits);

        if (isApprover) {
            const lowerText = text.toLowerCase().trim();
            const approveMatch = lowerText.match(/^approve\s+(\S+)/);
            const rejectMatch  = lowerText.match(/^reject\s+(\S+)/);
            const approvalId   = (approveMatch || rejectMatch)?.[1];

            if (approvalId) {
                const decision = approveMatch ? "approved" : "rejected";
                try {
                    const request = await db.zemaApprovalRequest.findUnique({ where: { id: approvalId } });
                    if (!request) {
                        await WhatsAppService.sendMessage(from,
                            `⚠️ ZEMA: Approval request *${approvalId}* not found or already resolved.`);
                        return NextResponse.json({ ok: true });
                    }
                    if (request.status !== "pending") {
                        await WhatsAppService.sendMessage(from,
                            `ℹ️ ZEMA: Request *${approvalId}* was already *${request.status}*.`);
                        return NextResponse.json({ ok: true });
                    }

                    // Persist the resolution
                    await db.zemaApprovalRequest.update({
                        where: { id: approvalId },
                        data: {
                            status: decision,
                            approvedBy: from,
                            resolvedAt: new Date(),
                        },
                    });

                    // Execute post-approval actions when approved
                    if (decision === "approved") {
                        const agentData = JSON.parse(request.agentDecision || "{}");
                        const offer = agentData.offer ?? {};

                        // 1. Release escrow if we have an orderId
                        if (request.orderId) {
                            try {
                                await fetch(`${process.env.NEXTAUTH_URL || "https://www.fairprice.ng"}/api/escrow/release`, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${process.env.ZEMA_SERVICE_TOKEN || ""}`,
                                    },
                                    body: JSON.stringify({ orderId: request.orderId, releasedBy: "zema_hitl" }),
                                }).catch(() => {});
                            } catch { /* non-blocking */ }
                        }

                        await WhatsAppService.sendMessage(from,
                            `✅ *ZEMA 360: Approved*\n\n` +
                            `Run: ${request.runId}\n` +
                            `Offer: ₦${offer.price?.toLocaleString() ?? "—"}\n` +
                            `${request.orderId ? `Order: ${request.orderId}\n` : ""}` +
                            `Escrow release and settlement queued.`);
                    } else {
                        await WhatsAppService.sendMessage(from,
                            `❌ *ZEMA 360: Rejected*\n\nRun ${request.runId} has been cancelled. No funds moved.`);
                    }

                    // Log for admin visibility
                    await db.whatsAppInteraction.create({
                        data: {
                            phoneNumber: from,
                            interaction_type: "zema_hitl_resolution",
                            payload: JSON.stringify({ approvalId, decision, runId: request.runId }),
                        },
                    }).catch(() => {});

                } catch (hitlErr: any) {
                    console.error("[HITL] approval error:", hitlErr);
                    await WhatsAppService.sendMessage(from,
                        `⚠️ ZEMA: Error processing *${approvalId}*. Please try again or check the dashboard.`);
                }
                return NextResponse.json({ ok: true });
            }
        }

        // --- 3. COMMANDS (/price, etc) ---
        if (text.startsWith("/")) {
            await handleCommand(from, text);
            return NextResponse.json({ ok: true });
        }

        // --- 4. ICEBREAKERS ---
        const iceBreakers = [
            "Check Real Market Price", 
            "How much last? Let's bargain", 
            "Apply for Financing", 
            "Help import or source a product"
        ];
        if (iceBreakers.includes(text)) {
            await handleIceBreaker(from, text);
            return NextResponse.json({ ok: true });
        }

        // --- 5. SELLER DIRECT DM ROUTING ---
        const sellerSession = await db.whatsAppNegotiationSession.findFirst({
            where: { sellerPhone: normalizedFrom },
            orderBy: { updatedAt: "desc" }
        });

        if (sellerSession) {
            const upperText = text.toUpperCase();
            const isSellerAction = upperText.startsWith("COUNTER") || upperText === "ACCEPT" || upperText === "REJECT";
            if (isSellerAction) {
                await handleSellerDirectReply(from, text, sellerSession);
                return NextResponse.json({ ok: true });
            }
        }

        // --- 6. CUSTOMER NEGOTIATION CONTEXT ---
        const negotiation = await db.negotiationRequest.findFirst({
            where: {
                OR: [
                    { customerWhatsapp: normalizedFrom },
                    { customerWhatsapp: from }
                ],
                status: { in: ["pending", "countered"] }
            },
            orderBy: { createdAt: "desc" },
            include: { product: { select: { name: true, price: true } } }
        });

        if (negotiation) {
            const upperText = text.toUpperCase();
            if (upperText === "ACCEPT") {
                await db.negotiationRequest.update({
                    where: { id: negotiation.id },
                    data: { status: "accepted" }
                });
                await WhatsAppService.sendMessage(from, `Deal Finalized! 🤝 Your offer for *${negotiation.product.name}* was accepted. Go to the website to pay!`);
                return NextResponse.json({ ok: true });
            }
            if (upperText === "REJECT") {
                await db.negotiationRequest.update({
                    where: { id: negotiation.id },
                    data: { status: "rejected" }
                });
                await WhatsAppService.sendMessage(from, `Negotiation for *${negotiation.product.name}* has been closed.`);
                return NextResponse.json({ ok: true });
            }
            const price = parseFloat(text.replace(/[^0-9.]/g, ""));
            if (!isNaN(price) && price > 0) {
                await db.negotiationRequest.update({
                    where: { id: negotiation.id },
                    data: { proposedPrice: price, status: "pending" }
                });
                await WhatsAppService.sendMessage(from, `📝 Offer updated to *₦${price.toLocaleString()}* for *${negotiation.product.name}*. We've notified the seller!`);
                return NextResponse.json({ ok: true });
            }
        }

        // --- 7. FALLBACK: SMART SEARCH & HELP ---
        // APP_URL already declared above in the ZEMA 360 block
        const greetings = ["hi", "hello", "hey", "sup", "menu", "start"];
        if (greetings.includes(text.toLowerCase()) || text.length < 3) {
            await WhatsAppService.sendMessage(from, `Welcome to FairPrice! 🚀\n\nHow can I help you today?\n\n- Reply with \`/price [product]\` to check market value\n- Browse our catalogue: ${APP_URL}`);
        } else {
            // Fuzzy Search
            try {
                const keywords = text.split(/\s+/).filter((w: string) => w.length > 2);
                const products = await db.product.findMany({
                    where: {
                        OR: keywords.map((kw: string) => ({
                            OR: [
                                { name: { contains: kw, mode: "insensitive" } },
                                { description: { contains: kw, mode: "insensitive" } },
                                { category: { contains: kw, mode: "insensitive" } },
                            ]
                        })),
                        isActive: true
                    },
                    take: 3,
                    select: { id: true, name: true, price: true, slug: true }
                });

                if (products.length > 0) {
                    let msg = `🔍 *I found these on FairPrice for you:*\n\n`;
                    products.forEach((p: any) => {
                        const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        msg += `*${p.name}*\n💰 ₦${p.price.toLocaleString()}\n🔗 ${APP_URL}/product/${p.id}/${slug}\n\n`;
                    });
                    await WhatsAppService.sendMessage(from, msg);
                } else {
                    await WhatsAppService.sendMessage(from, `I couldn't find a direct match for *"${text}"*. Try searching here:\n🔗 ${APP_URL}/search?q=${encodeURIComponent(text)}`);
                }
            } catch (e) {
                await WhatsAppService.sendMessage(from, `I've noted your message. Browse our latest deals here:\n🔗 ${APP_URL}`);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("WhatsApp Webhook Error:", error);
        // Log Error for Admin
        await db.whatsAppInteraction.create({
            data: {
                phoneNumber: "SYSTEM",
                interaction_type: "error",
                payload: `Webhook Error: ${error.message || "Unknown error"}`
            }
        }).catch(() => {});
        return NextResponse.json({ ok: true }); // Always return 200 to Meta to avoid retries on error
    }
}

// --- HELPER FUNCTIONS FOR CONVERSATIONAL COMPONENTS --- //

async function handleCommand(from: string, text: string) {
    const parts = text.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");

    // Log the interaction intent
    await db.whatsAppInteraction.create({
        data: { 
            phoneNumber: from, 
            interaction_type: "command", 
            payload: JSON.stringify({ command, args, fullText: text })
        }
    });

    const APP_URL = process.env.NEXTAUTH_URL || "https://www.fairprice.ng";

    if (command === "/price") {
        if (args) {
            await WhatsAppService.sendMessage(from, `Looking up verified market prices for *${args}*...\n\nClick here to see ZIVA's real-time price analysis:\n🔗 ${APP_URL}/search?q=${encodeURIComponent(args)}`);
        } else {
            await WhatsAppService.sendMessage(from, "What product do you want to check? Reply with `/price [product name]` (e.g., `/price iPhone 13`).");
        }
    } else if (command === "/haggle") {
        if (args) {
            const targetPrice = parseFloat(args.replace(/[^0-9.]/g, ""));
            await WhatsAppService.sendMessage(from, `Starting ZIVA-mediated negotiation at ₦${targetPrice ? targetPrice.toLocaleString() : 'your proposed price'}. We'll notify the seller!`);
        } else {
            await WhatsAppService.sendMessage(from, `Ready to haggle? Browse our catalogue and click "Negotiate" on any product, or reply with a link to the product here:\n🔗 ${APP_URL}`);
        }
    } else if (command === "/pay") {
        await WhatsAppService.sendMessage(from, `Generating your secure payment environment...\n\n🔗 Click to Checkout: ${APP_URL}/checkout/direct\n\n(This opens securely right inside WhatsApp!)`);
    } else if (command === "/verify") {
        await WhatsAppService.sendMessage(from, `Checking trust score for seller ID: ${args || "unknown"}. Please wait...`);
    } else if (command === "/help") {
        await WhatsAppService.sendMessage(from, "A FairPrice human agent will be with you shortly. How can we help?");
    } else {
        await WhatsAppService.sendMessage(from, "Unknown command. Try /price, /haggle, /verify, or /pay.");
    }
}

async function handleIceBreaker(from: string, text: string) {
    // Log the interaction intent
    await db.whatsAppInteraction.create({
        data: { 
            phoneNumber: from, 
            interaction_type: "ice_breaker", 
            payload: JSON.stringify({ iceBreaker: text, timestamp: new Date().toISOString() })
        }
    });

    const APP_URL = process.env.NEXTAUTH_URL || "https://www.fairprice.ng";

    if (text === "Check Real Market Price") {
        await WhatsAppService.sendMessage(from, `Welcome to FairPrice! ZIVA AI ensures you Buy & Sell with no wahala.\n\nReply with \`/price [product name]\` or search our catalog directly inside WhatsApp:\n🔗 ${APP_URL}/search`);
    } else if (text === "How much last? Let's bargain") {
        await WhatsAppService.sendMessage(from, `Ready to haggle? Our sellers are open to offers!\n\nBrowse products and click the 🤝 Negotiate button to start haggling directly from here:\n🔗 ${APP_URL}`);
    } else if (text === "Apply for Financing") {
        await WhatsAppService.sendMessage(from, "Want to Buy Now and Pay Later? Let's check your financing eligibility.\n\nPlease reply with your registered email address.");
    } else if (text === "Help import or source a product") {
        await WhatsAppService.sendMessage(from, "Can't find what you're looking for? Our global sourcing team can help you import it safely using FairPrice Escrow.\n\nReply with the product name or a link to the item, and an agent will assist you.");
    }
}

async function handleSellerDirectReply(from: string, text: string, session: any) {
    const upperText = text.toUpperCase();
    const negotiationId = session.negotiationId;

    const negotiation = await db.negotiationRequest.findUnique({
        where: { id: negotiationId },
        include: { product: true }
    });

    if (!negotiation) return;

    if (upperText === "ACCEPT") {
        await db.negotiationRequest.update({
            where: { id: negotiationId },
            data: { status: "accepted" }
        });

        await WhatsAppService.sendMessage(from, `✅ You've accepted the offer for *${negotiation.product.name}*. We'll notify the customer to complete payment.`);
        
        if (session.customerPhone) {
            await WhatsAppService.sendMessage(session.customerPhone, `🎉 Good news! The seller has ACCEPTED your offer for *${negotiation.product.name}* at ₦${negotiation.proposedPrice.toLocaleString()}. Go to the website to pay!`);
        }
    } else if (upperText === "REJECT") {
        await db.negotiationRequest.update({
            where: { id: negotiationId },
            data: { status: "rejected" }
        });
        await WhatsAppService.sendMessage(from, `❌ You've rejected the offer for *${negotiation.product.name}*.`);
        
        if (session.customerPhone) {
            await WhatsAppService.sendMessage(session.customerPhone, `😔 Sorry, the seller has declined your offer for *${negotiation.product.name}*. Try searching for other deals!`);
        }
    } else if (upperText.startsWith("COUNTER")) {
        const priceStr = text.replace(/[^0-9]/g, "");
        const counterPrice = parseFloat(priceStr);

        if (!isNaN(counterPrice) && counterPrice > 0) {
            await db.negotiationRequest.update({
                where: { id: negotiationId },
                data: { 
                    counterPrice,
                    status: "countered"
                }
            });

            await WhatsAppService.sendMessage(from, `📤 Counter-offer of *₦${counterPrice.toLocaleString()}* sent to the customer.`);
            
            if (session.customerPhone) {
                await WhatsAppService.sendNegotiationUpdate(session.customerPhone, {
                    productName: negotiation.product.name,
                    newPrice: counterPrice,
                    sellerName: "The Seller",
                    negotiationId: negotiation.id
                });
            }
        } else {
            await WhatsAppService.sendMessage(from, "⚠️ Invalid counter-offer format. Use: `counter 50000`.");
        }
    }
}
