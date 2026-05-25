import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";

/**
 * POST /api/auth/issue-token
 * Issues a JWT for a user whose identity was already verified client-side
 * (e.g. email OTP code). Looks up the user by email and returns a signed token.
 *
 * This endpoint does NOT re-verify identity — it must only be called after
 * a successful verification step (e.g. email code, WA OTP) has been completed.
 */
export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

        const user = await db.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, email: true, role: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const token = signToken({ userId: user.id, email: user.email, role: user.role as any });
        return NextResponse.json({ token });
    } catch (err: any) {
        console.error("[issue-token] error:", err);
        return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }
}
