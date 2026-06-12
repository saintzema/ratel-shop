import { db } from "./db";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WABA_ID = process.env.WHATSAPP_WABA_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const API_VERSION = "v20.0";

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

            // Log OUTBOUND interaction for Admin Visibility
            await db.whatsAppInteraction.create({
                data: {
                    phoneNumber: cleanTo,
                    interaction_type: "outbound_message",
                    payload: JSON.stringify({
                        text,
                        status: data.error ? "error" : "sent",
                        response: data,
                        timestamp: new Date().toISOString()
                    })
                }
            }).catch((e: any) => console.error("Failed to log outbound interaction:", e));

            return data;
        } catch (error) {
            console.error("WhatsApp Send Error:", error);
            return null;
        }
    }

    /**
     * Sends an interactive CTA-URL message — the button opens inside WhatsApp's
     * built-in browser instead of launching an external app.
     */
    static async sendCTALink(to: string, bodyText: string, buttonLabel: string, url: string) {
        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            console.warn("WhatsApp credentials missing. CTA message suppressed.");
            return null;
        }
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
                        type: "interactive",
                        interactive: {
                            type: "cta_url",
                            body: { text: bodyText },
                            action: {
                                name: "cta_url",
                                parameters: { display_text: buttonLabel, url },
                            },
                        },
                    }),
                }
            );
            const data = await response.json();
            await db.whatsAppInteraction.create({
                data: {
                    phoneNumber: cleanTo,
                    interaction_type: "outbound_cta",
                    payload: JSON.stringify({ bodyText, buttonLabel, url, response: data, timestamp: new Date().toISOString() }),
                },
            }).catch(() => {});
            return data;
        } catch (error) {
            console.error("WhatsApp CTA Send Error:", error);
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
     * Sends a direct DM to the seller when a negotiation is received
     */
    static async sendSellerNegotiationDM(to: string, data: {
        customerName: string,
        productName: string,
        proposedPrice: number,
        negotiationId: string
    }) {
        const message = `💰 *New Offer Received!*\n\n${data.customerName} is offering *₦${data.proposedPrice.toLocaleString()}* for your *${data.productName}*.\n\nReply directly to this message to counter or accept.\n- Format: "counter [price]" (e.g. counter 45000)\n- Format: "ACCEPT" to finalize.\n- Format: "REJECT" to decline.`;
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
                `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
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
     * Sends a flexible marketing broadcast (e.g. Happy New Month)
     * Uses a template with variables for the message and link
     */
    static async sendMarketingBroadcast(to: string, data: { 
        templateName: string, 
        bodyText?: string, 
        headerImage?: string,
        buttonLink?: string 
    }) {
        const components: any[] = [];

        if (data.headerImage) {
            components.push({
                type: "header",
                parameters: [{ type: "image", image: { link: data.headerImage } }]
            });
        }

        if (data.bodyText) {
            components.push({
                type: "body",
                parameters: [{ type: "text", text: data.bodyText }]
            });
        }

        if (data.buttonLink) {
            components.push({
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: data.buttonLink.split('/').pop() || "" }]
            });
        }

        return this.sendMarketingMessage(to, data.templateName, components);
    }

    /**
     * Sends a verification code using an 'Authentication' category template.
     * Requirement: Template must be created in Meta Business Manager first.
     * Recommended Template Body: "{{1}} is your verification code."
     */
    static async sendVerificationTemplate(to: string, code: string, templateName: string = "verification_code") {
        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            console.warn("WhatsApp credentials missing. Verification code suppressed:", code);
            return null;
        }

        const cleanTo = this.normalizePhoneNumber(to);

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
                        to: cleanTo,
                        type: "template",
                        template: {
                            name: templateName,
                            language: { code: "en_US" },
                            components: [
                                {
                                    type: "body",
                                    parameters: [{ type: "text", text: code }]
                                },
                                {
                                    type: "button",
                                    sub_type: "url",
                                    index: "0",
                                    parameters: [{ type: "text", text: code }]
                                }
                            ]
                        },
                    }),
                }
            );

            const data = await response.json();
            if (data.error) {
                console.error("WhatsApp Template Error:", data.error);
            }
            return data;
        } catch (error) {
            console.error("WhatsApp Template Send Error:", error);
            return null;
        }
    }

    /**
     * Sends the default 'hello_world' template for initial connection testing
     */
    static async sendTestMessage(to: string) {
        return this.sendMarketingMessage(to, "hello_world", []);
    }

    /**
     * Generates a unique 6-digit verification code
     */
    static generateVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Normalises any phone number to E.164 digits (no leading "+").
     *
     * Rules (in order):
     *  1. Strip leading "+" then all non-digit characters (spaces, dashes, brackets)
     *  2. Nigerian shorthand:
     *       "0XXXXXXXXXX" (11 digits starting with 0)  → "234XXXXXXXXXX"
     *       bare 10-digit number with no country code   → "234XXXXXXXXXX" (NG default)
     *  3. Numbers already carrying a country code are kept as-is.
     *
     * Returns empty string on unrecognisable input (< 10 or > 15 digits).
     */
    static normalizePhoneNumber(phone: string): string {
        if (!phone) return "";
        // Remove leading + then strip all non-digit characters
        let clean = phone.trim().replace(/^\+/, "").replace(/\D/g, "");

        // Nigerian local: 0XXXXXXXXXX (11 digits starting with 0)
        if (clean.startsWith("0") && clean.length === 11) {
            clean = "234" + clean.substring(1);
        }

        // Bare 10-digit number → assume Nigerian
        if (clean.length === 10 && !clean.startsWith("0")) {
            clean = "234" + clean;
        }

        // Valid E.164 body must be 10–15 digits
        if (clean.length < 10 || clean.length > 15) return "";

        return clean; // e.g. "2348012345678", "447911123456", "12025550123"
    }

    /**
     * Returns ALL plausible stored formats for duplicate checks.
     *
     * Nigerian example for "2348169878676":
     *   ["2348169878676", "+2348169878676", "08169878676", "8169878676"]
     *
     * International example for "447911123456":
     *   ["447911123456", "+447911123456"]
     */
    static allPhoneVariants(phone: string): string[] {
        if (!phone) return [];
        const normalized = this.normalizePhoneNumber(phone);
        if (!normalized) return [];

        const variants = new Set<string>();
        variants.add(normalized);            // digits only, no +
        variants.add("+" + normalized);      // E.164 with +

        // Nigerian-specific local forms
        if (normalized.startsWith("234") && normalized.length === 13) {
            variants.add("0" + normalized.substring(3));  // 08169878676
            variants.add(normalized.substring(3));         // 8169878676 (10-digit)
        }

        // Also keep the raw form passed in case it was already stored verbatim
        const raw = phone.trim().replace(/\D/g, "");
        if (raw.length >= 10) variants.add(raw);

        return Array.from(variants).filter(v => v.length >= 10);
    }

    /**
     * Returns all possible auto-generated WA placeholder email addresses.
     * Covers current format (wa_234...) and legacy format (wa-0...).
     */
    static allWaEmailVariants(phone: string): string[] {
        const variants = this.allPhoneVariants(phone);
        const seen = new Set<string>();
        const emails: string[] = [];
        for (const v of variants) {
            const digits = v.replace(/^\+/, ""); // always use digits-only in emails
            for (const prefix of ["wa_", "wa-"]) {
                const email = `${prefix}${digits}@fairprice.ng`;
                if (!seen.has(email)) { seen.add(email); emails.push(email); }
            }
        }
        return emails;
    }
}
