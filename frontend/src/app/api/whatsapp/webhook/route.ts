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

        if (!text && !message.interactive) return NextResponse.json({ ok: true });

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
                    const APP_URL = process.env.NEXTAUTH_URL || "https://fairprice.ng";
                    await WhatsAppService.sendMessage(from, `✅ *Verified!* Your account is now securely linked to WhatsApp.\n\n🔗 *Back to FairPrice:* ${APP_URL}/login?wa_code=${code}`);
                    return NextResponse.json({ ok: true });
                }
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
        const APP_URL = process.env.NEXTAUTH_URL || "https://fairprice.ng";
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

    const APP_URL = process.env.NEXTAUTH_URL || "https://fairprice.ng";

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

    const APP_URL = process.env.NEXTAUTH_URL || "https://fairprice.ng";

    if (text === "Check Real Market Price") {
        await WhatsAppService.sendMessage(from, `Welcome to FairPrice! ZIVA AI ensures you never overpay.\n\nReply with \`/price [product name]\` or search our catalog directly inside WhatsApp:\n🔗 ${APP_URL}/search`);
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
