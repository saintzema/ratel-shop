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
        const text = message.text?.body?.trim();

        if (!text) return NextResponse.json({ ok: true });

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

            const iceBreakers = ["Check Real Market Price", "Negotiate a Deal", "Find a Verified Seller", "Apply for Financing"];
            if (iceBreakers.includes(text)) {
                await handleIceBreaker(from, text);
                return NextResponse.json({ ok: true });
            }

            // Optional: Log or send a generic help message
            return NextResponse.json({ ok: true });
        }

        // LOGIC: Handle User Reply
        const upperText = text.toUpperCase();

        if (upperText === "ACCEPT") {
            await db.negotiationRequest.update({
                where: { id: negotiation.id },
                data: { status: "accepted" }
            });

            await WhatsAppService.sendMessage(from, 
                `Deal Finalized! 🤝 Your offer for *${negotiation.product.name}* at ₦${negotiation.proposedPrice.toLocaleString()} was accepted.\n\nGo to your FairPrice account to complete payment.`
            );
        } else if (upperText === "REJECT" || upperText === "CANCEL") {
            await db.negotiationRequest.update({
                where: { id: negotiation.id },
                data: { status: "rejected" }
            });
            await WhatsAppService.sendMessage(from, `Negotiation for *${negotiation.product.name}* has been closed.`);
        } else {
            // Check if user replied with a numeric price (Counter-offer)
            const numericValue = parseFloat(text.replace(/[^0-9.]/g, ""));
            
            if (!isNaN(numericValue) && numericValue > 0) {
                // Update the negotiation with the new proposed price
                await db.negotiationRequest.update({
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
    await db.whatsAppInteraction.create({
        data: { phoneNumber: from, interaction_type: "command", payload: command }
    });

    if (command === "/price") {
        await WhatsAppService.sendMessage(from, `Looking up verified market prices for: ${args || "that item"}. Please wait a moment...`);
    } else if (command === "/haggle") {
        const targetPrice = parseFloat(args.replace(/[^0-9.]/g, ""));
        await WhatsAppService.sendMessage(from, `Starting ZIVA-mediated negotiation at ₦${targetPrice ? targetPrice.toLocaleString() : 'your proposed price'}. We'll notify the seller!`);
    } else if (command === "/pay") {
        await WhatsAppService.sendMessage(from, "Generating your secure payment link...\n\n🔗 https://fairprice.ng/checkout/direct");
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
        data: { phoneNumber: from, interaction_type: "ice_breaker", payload: text }
    });

    if (text === "Check Real Market Price") {
        await WhatsAppService.sendMessage(from, "Welcome to FairPrice! What product would you like to check the real market price for? Reply with the product name.");
    } else if (text === "Negotiate a Deal") {
        await WhatsAppService.sendMessage(from, "Ready to haggle? Paste the product link or name and let's get you a deal!");
    } else if (text === "Find a Verified Seller") {
        await WhatsAppService.sendMessage(from, "Looking for trusted sellers? Tell us what category you are shopping in (e.g. Electronics, Fashion).");
    } else if (text === "Apply for Financing") {
        await WhatsAppService.sendMessage(from, "Want to Buy Now and Pay Later? Let's check your financing eligibility. Please provide your email address.");
    }
}
