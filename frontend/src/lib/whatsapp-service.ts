import { db } from "./db";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = "v21.0";

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
}
