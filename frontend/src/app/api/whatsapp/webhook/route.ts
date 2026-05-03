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
        
        // Extract message components
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];

        if (!message) return NextResponse.json({ ok: true });

        const from = message.from; // Sender phone number
        // Handle standard text OR interactive button replies (Ice Breakers/Quick Replies)
        const text = message.text?.body?.trim() 
                  || message.interactive?.button_reply?.title?.trim() 
                  || message.interactive?.list_reply?.title?.trim() 
                  || message.button?.text?.trim() 
                  || "";

        if (!text) return NextResponse.json({ ok: true });

        // --- NEW: LOGIN VERIFICATION HANDLING ---
        if (text.toLowerCase().startsWith("verify fairprice:")) {
            const code = text.split(":")[1]?.trim();
            if (code) {
                const verification = await db.whatsAppVerification.findUnique({
                    where: { code }
                });

                if (verification && new Date() < verification.expiresAt) {
                    await db.whatsAppVerification.update({
                        where: { id: verification.id },
                        data: { status: "verified" }
                    });

                    await WhatsAppService.sendMessage(from, 
                        `✅ *Verified!* Your account is now securely linked to WhatsApp.\n\nYou can now return to the website to continue your login. You're now locked into the FairPrice conversational ecosystem! 🚀`
                    );
                    return NextResponse.json({ ok: true });
                } else {
                    await WhatsAppService.sendMessage(from, `❌ *Invalid or Expired Code.* Please request a new login link from the website.`);
                    return NextResponse.json({ ok: true });
                }
            }
        }
        // ------------------------------------------

        // FIND ACTIVE NEGOTIATION
        // We look for the most recent negotiation that isn't already closed
        const negotiation = await (db.negotiationRequest as any).findFirst({
            where: {
                OR: [
                    { customerWhatsapp: from },
                    { customerWhatsapp: `+${from}` },
                    { customerWhatsapp: from.startsWith("234") ? from.replace("234", "0") : from }
                ],
                status: { in: ["pending", "countered"] }
            },
            orderBy: { createdAt: "desc" },
            include: { 
                product: {
                    select: { name: true, price: true }
                }
            }
        }) as any;

        if (!negotiation) {
            // NEW: Conversational Components (Ice Breakers & Commands)
            if (text.startsWith("/")) {
                await handleCommand(from, text);
                return NextResponse.json({ ok: true });
            }

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

            // Check if this is an order message from WhatsApp checkout (ignore, admin will handle)
            if (text.includes("NEW ORDER") && text.includes("fairprice.ng")) {
                return NextResponse.json({ ok: true });
            }

            const APP_URL = process.env.NEXTAUTH_URL || "https://fairprice.ng";

            // Smart product search — if the message looks like a product query (3+ chars, not a greeting),
            // search our catalog and return PDP links with prices
            const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "sup", "yo", "start", "menu"];
            const isGreeting = greetings.includes(text.toLowerCase()) || text.length < 3;

            if (!isGreeting) {
                try {
                    // Fuzzy Search: Split into keywords for better matching
                    const keywords = text.split(/\s+/).filter((w: string) => w.length > 2);
                    const searchConditions = keywords.map((kw: string) => ({
                        OR: [
                            { name: { contains: kw, mode: "insensitive" } },
                            { description: { contains: kw, mode: "insensitive" } },
                            { category: { contains: kw, mode: "insensitive" } },
                        ]
                    }));

                    // Search for matching products in the database using fuzzy keyword logic
                    const products = await (db.product as any).findMany({
                        where: {
                            AND: searchConditions.length > 0 ? searchConditions : [
                                { name: { contains: text, mode: "insensitive" } }
                            ],
                            status: "approved"
                        },
                        take: 5, // Meta limits
                        orderBy: { createdAt: "desc" },
                        select: { id: true, name: true, price: true, slug: true, category: true }
                    });

                    if (products && products.length > 0) {
                        // Build a product listing message with precise PDP links
                        let msg = `🔍 *Found ${products.length} result${products.length > 1 ? 's' : ''} for "${text}":*\n\n`;
                        
                        products.forEach((p: any, i: number) => {
                            const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                            const pdpUrl = `${APP_URL}/product/${p.id}/${slug}`;
                            
                            msg += `${i + 1}. *${p.name}*\n`;
                            msg += `   💰 ₦${Number(p.price).toLocaleString()}\n`;
                            msg += `   🔗 *View & Buy:* ${pdpUrl}\n\n`;
                        });

                        msg += `_Tap any link to view details and order directly!_\n`;
                        msg += `_Or type another product name to search again._`;

                        await WhatsAppService.sendMessage(from, msg);
                        return NextResponse.json({ ok: true });
                    }
                } catch (searchErr) {
                    console.error("WhatsApp product search error:", searchErr);
                    // Fall through to welcome message if search fails
                }

                // No products found — send search link so they can try on the site
                await WhatsAppService.sendMessage(from,
                    `We couldn't find *"${text}"* in our catalog right now.\n\n` +
                    `Try searching on our website for more options:\n` +
                    `🔗 ${APP_URL}/search?q=${encodeURIComponent(text)}\n\n` +
                    `_Our AI-powered search can find products from across Nigeria!_`
                );
                return NextResponse.json({ ok: true });
            }

            // Welcome message for greetings and short messages
            await WhatsAppService.sendMessage(from, 
                `Welcome to *FairPrice Shopping!* 🛍️\n\n` +
                `We help you find the best deals with verified prices across Nigeria.\n\n` +
                `🔗 *Browse our store:*\n${APP_URL}\n\n` +
                `Just tap the link above to browse, search for any product, and place your order — all right here inside WhatsApp!\n\n` +
                `You can also:\n` +
                `• Type a product name to search (e.g. "iPhone 15")\n` +
                `• Type /price [product] to check market prices\n` +
                `• Type /help for human assistance\n\n` +
                `_Powered by FairPrice.ng — Nigeria's trusted marketplace_ ✅`
            );
            return NextResponse.json({ ok: true });
        }

        // LOGIC: Handle User Reply
        const upperText = text.toUpperCase();

        if (upperText === "ACCEPT") {
            await (db as any).negotiationRequest.update({
                where: { id: negotiation.id },
                data: { status: "accepted" }
            });

            await WhatsAppService.sendMessage(from, 
                `Deal Finalized! 🤝 Your offer for *${negotiation.product.name}* at ₦${negotiation.proposedPrice.toLocaleString()} was accepted.\n\nGo to your FairPrice account to complete payment.`
            );
        } else if (upperText === "REJECT" || upperText === "CANCEL") {
            await (db as any).negotiationRequest.update({
                where: { id: negotiation.id },
                data: { status: "rejected" }
            });
            await WhatsAppService.sendMessage(from, `Negotiation for *${negotiation.product.name}* has been closed.`);
        } else {
            // Check if user replied with a numeric price (Counter-offer)
            const numericValue = parseFloat(text.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(numericValue) && numericValue > 0) {
                // Update the negotiation with the new proposed price
                await (db as any).negotiationRequest.update({
                    where: { id: negotiation.id },
                    data: { 
                        proposedPrice: numericValue,
                        status: "pending" // Reset status so seller sees the new offer
                    }
                });

                await WhatsAppService.sendMessage(from, 
                    `Got it! Your new offer of *₦${numericValue.toLocaleString()}* for *${negotiation.product.name}* has been sent to the seller.\n\nWait for their response here!`
                );
            } else {
                // Generic fallback if text is neither 'accept' nor a number
                await WhatsAppService.sendMessage(from, 
                    `Hi! Please reply with a price (e.g. 50000) to counter-offer, or type *ACCEPT* to close the deal.`
                );
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("WhatsApp Webhook Error:", error);
        return NextResponse.json({ ok: true }); // Always return 200 to Meta to avoid retries on error
    }
}

// --- HELPER FUNCTIONS FOR CONVERSATIONAL COMPONENTS --- //

async function handleCommand(from: string, text: string) {
    const parts = text.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");

    // Log the interaction intent
    await (db as any).whatsAppInteraction.create({
        data: { phoneNumber: from, interaction_type: "command", payload: command }
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
    await (db as any).whatsAppInteraction.create({
        data: { phoneNumber: from, interaction_type: "ice_breaker", payload: text }
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
