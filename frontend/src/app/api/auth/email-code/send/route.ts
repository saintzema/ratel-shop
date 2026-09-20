import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { buildEmailTemplate } from "@/lib/email-templates";
import { createEmailLoginChallenge, normEmail } from "@/lib/email-login";

export const dynamic = "force-dynamic";

const SENDS = new Map<string, number[]>();
function allow(key: string) {
    const now = Date.now();
    const recent = (SENDS.get(key) || []).filter(t => now - t < 10 * 60 * 1000);
    if (recent.length >= 5) return false;
    SENDS.set(key, [...recent, now]);
    return true;
}

/** POST /api/auth/email-code/send { email, redirect? } — emails a 6-digit code + one-tap sign-in link. */
export async function POST(req: Request) {
    try {
        const { email, redirect } = await req.json();
        if (!email || typeof email !== "string" || !email.includes("@")) {
            return NextResponse.json({ success: false, error: "Valid email required" }, { status: 400 });
        }
        const e = normEmail(email);
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!allow(`e:${e}`) || !allow(`ip:${ip}`)) {
            return NextResponse.json({ success: false, error: "Too many requests. Try again in a few minutes." }, { status: 429 });
        }

        const user = await db.user.findUnique({ where: { email: e }, select: { name: true } });
        // Same response whether or not the account exists — no account enumeration.
        if (user) {
            const { code, linkToken } = await createEmailLoginChallenge(e);
            const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.fairprice.ng";
            const safeRedirect = typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
            const magicLink = `${origin}/auth/magic?email=${encodeURIComponent(e)}&token=${linkToken}&redirect=${encodeURIComponent(safeRedirect)}`;
            const { subject, html } = buildEmailTemplate("VERIFY_EMAIL", { name: user.name || "there", code, magicLink } as any);
            const resend = new Resend(process.env.RESEND_API_KEY || "");
            const r = await resend.emails.send({
                from: "🛍️ FairPrice Shop <hello@fairprice.ng>",
                replyTo: process.env.ESCALATION_EMAIL || "fairprice2026@gmail.com",
                to: [e], subject, html,
            });
            if (r.error) {
                console.error("[email-code] send failed:", r.error);
                return NextResponse.json({ success: false, error: "Could not send the email. Please try again." }, { status: 502 });
            }
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[email-code/send]", err);
        return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 500 });
    }
}
