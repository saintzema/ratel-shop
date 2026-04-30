import { db } from "./db";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WABA_ID = process.env.WHATSAPP_WABA_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const API_VERSION = "v25.0";

export class WhatsAppService {
    /**
     * Sends a plain text message via WhatsApp Cloud API
     */
    static async sendMessage(to: string, text: string) {
        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            console.warn("WhatsApp credentials missing. Message suppressed:", text);
            return null;
        }

        // Normalize phone number (ensure no + and starts with country code)
        const cleanTo = to.replace(/\D/g, "");

        try {
            const response = await fetch(
                `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: cleanTo,
                        type: "text",
                        text: { body: text },
                    }),
                }
            );

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("WhatsApp Send Error:", error);
            return null;
        }
    }

    /**
     * Sends a negotiation alert to the customer when a seller counters
     */
    static async sendNegotiationUpdate(to: string, data: {
        productName: string,
        newPrice: number,
        sellerName: string,
        negotiationId: string
    }) {
        const message = `Hello! ${data.sellerName} has countered your offer for *${data.productName}*.\n\nNew Price: *₦${data.newPrice.toLocaleString()}*\n\nReply with your counter-offer (e.g. 50000) or 'ACCEPT' to finalize the deal.`;
        return this.sendMessage(to, message);
    }

    /**
     * Sends an initial confirmation when a negotiation starts
     */
    static async sendNegotiationStarted(to: string, data: {
        productName: string,
        proposedPrice: number,
        negotiationId: string
    }) {
        const message = `Negotiation Started! Your offer of ₦${data.proposedPrice.toLocaleString()} for *${data.productName}* has been sent to the seller.\n\nYou'll receive updates here on WhatsApp when the seller responds.`;
        return this.sendMessage(to, message);
    }

    /**
     * Sends a marketing message via the new /marketing_messages endpoint
     * This uses Meta's automatic delivery optimizations
     */
    static async sendMarketingMessage(to: string, templateName: string, components: any[]) {
        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            console.warn("WhatsApp credentials missing. Marketing message suppressed.");
            return null;
        }

        const cleanTo = to.replace(/\D/g, "");

        try {
            const response = await fetch(
                `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/marketing_messages`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        to: cleanTo,
                        type: "template",
                        template: {
                            name: templateName,
                            language: { code: "en_US" },
                            components: components
                        },
                    }),
                }
            );

            const data = await response.json();
            if (data.error) {
                console.error("WhatsApp Marketing API Error:", data.error);
            }
            return data;
        } catch (error) {
            console.error("WhatsApp Marketing Send Error:", error);
            return null;
        }
    }

    /**
     * Sends a direct product offer with a Buy Now link
     */
    static async sendProductOffer(to: string, product: { name: string, price: number, url: string, imageUrl?: string }) {
        const components = [
            {
                type: "header",
                parameters: product.imageUrl ? [{ type: "image", image: { link: product.imageUrl } }] : []
            },
            {
                type: "body",
                parameters: [
                    { type: "text", text: product.name },
                    { type: "text", text: `₦${product.price.toLocaleString()}` }
                ]
            },
            {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: product.url.split('/').pop() }]
            }
        ];

        return this.sendMarketingMessage(to, "product_offer_v1", components);
    }

    /**
     * Sends the default 'hello_world' template for initial connection testing
     */
    static async sendTestMessage(to: string) {
        return this.sendMarketingMessage(to, "hello_world", []);
    }
}
