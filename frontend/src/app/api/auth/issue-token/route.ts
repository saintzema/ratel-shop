import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";
import { issueSessionForEmail } from "@/lib/session-token";

// A freshly registered account has no other proof to show yet (registration creates the user and
// signs them in straight away) — allow a short window for that one flow only.
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

/**
 * POST /api/auth/issue-token { email }
 *
 * This used to hand a signed JWT to ANYONE who posted an email address — including an admin's —
 * because it "trusted" that verification had happened client-side. It now requires real proof for
 * the account, one of:
 *   1. a still-valid FairPrice JWT for that same account (token refresh / role re-resolve),
 *   2. a NextAuth (Google/Apple) session for that same email,
 *   3. the account having been created in the last few minutes (the registration flow).
 * New sign-ins go through /api/auth/verify (password), /api/auth/email-code/verify (code or magic
 * link) or the WhatsApp OTP verify route, all of which return their own token directly.
 */
export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
        const e = String(email).toLowerCase().trim();

        let proven = false;

        const bearer = getUserFromRequest(req);
        if (bearer?.email && bearer.email.toLowerCase() === e) proven = true;

        if (!proven) {
            try {
                const session: any = await getServerSession(authOptions as any);
                if (session?.user?.email && String(session.user.email).toLowerCase() === e) proven = true;
            } catch { /* no session cookie */ }
        }

        if (!proven) {
            const u = await db.user.findUnique({ where: { email: e }, select: { createdAt: true } });
            if (u?.createdAt && Date.now() - u.createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS) proven = true;
        }

        if (!proven) return NextResponse.json({ error: "Not authorised for this account" }, { status: 401 });

        const session = await issueSessionForEmail(e);
        if (!session) return NextResponse.json({ error: "User not found" }, { status: 404 });
        return NextResponse.json({ token: session.token, ...(session.staffOf ? { staffOf: session.staffOf } : {}) });
    } catch (err: any) {
        console.error("[issue-token] error:", err);
        return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }
}
