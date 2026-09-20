import { NextResponse } from "next/server";
import { consumeEmailLoginChallenge } from "@/lib/email-login";
import { issueSessionForEmail } from "@/lib/session-token";

export const dynamic = "force-dynamic";

/** POST /api/auth/email-code/verify { email, code } | { email, token } → { token, user } */
export async function POST(req: Request) {
    try {
        const { email, code, token } = await req.json();
        if (!email || (!code && !token)) {
            return NextResponse.json({ success: false, error: "Email and code required" }, { status: 400 });
        }
        const res = await consumeEmailLoginChallenge(email, { code, token });
        if (!res.ok) {
            return NextResponse.json({
                success: false,
                error: res.reason === "locked" ? "Too many wrong attempts. Request a new code." : "Invalid or expired code.",
            }, { status: 401 });
        }
        const session = await issueSessionForEmail(email);
        if (!session) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
        return NextResponse.json({ success: true, token: session.token, staffOf: session.staffOf, user: session.user });
    } catch (err) {
        console.error("[email-code/verify]", err);
        return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 500 });
    }
}
