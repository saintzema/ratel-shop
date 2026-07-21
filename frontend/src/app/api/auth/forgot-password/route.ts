import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await db.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            // For security, don't reveal if user exists. 
            // Just return success as if we sent it.
            return NextResponse.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
        }

        // Generate token
        const token = crypto.randomUUID();
        const expires = new Date(Date.now() + 3600000); // 1 hour expiration

        // Save to DB
        await db.verificationToken.upsert({
            where: {
                identifier_token: {
                    identifier: normalizedEmail,
                    token: token
                }
            },
            update: {
                token: token,
                expires: expires
            },
            create: {
                identifier: normalizedEmail,
                token: token,
                expires: expires
            }
        });

        // Send Email — NEXTAUTH_URL is set to the raw Vercel deployment URL in this
        // project's env config (meant for OAuth callbacks), not the custom domain, so
        // using it here sent password-reset links to fairprice-ten.vercel.app instead of
        // fairprice.ng. FAIRPRICE_URL is the dedicated var for user-facing links, already
        // used the same way elsewhere (e.g. the WhatsApp webhook's CTA links).
        const site = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";
        const resetLink = `${site}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

        await fetch(`${site}/api/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: normalizedEmail,
                type: "CHANGE_PASSWORD",
                payload: { 
                    name: user.name || normalizedEmail.split("@")[0],
                    resetLink: resetLink 
                }
            })
        });

        return NextResponse.json({ success: true, message: "Password reset link sent successfully." });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
