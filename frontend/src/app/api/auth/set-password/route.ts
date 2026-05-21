import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "@/lib/jwt";

/**
 * POST /api/auth/set-password
 *
 * Two modes:
 * 1. Reset flow (token-based): { email, password, token }
 * 2. Authenticated set (for logged-in users who have no password yet, e.g. WhatsApp-only accounts):
 *    { password } — JWT must be present in Authorization header
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, token } = body;

        if (!password || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }
        const hashedPassword = await bcrypt.hash(password, 12);

        // ── Mode 1: Authenticated user setting password for first time ──
        // No token required — user is already logged in via JWT
        if (!token) {
            const payload = getUserFromRequest(request);
            if (!payload) {
                return NextResponse.json({ error: "Authentication required" }, { status: 401 });
            }
            await db.user.update({
                where: { id: payload.userId },
                data: { password: hashedPassword },
            });
            return NextResponse.json({ success: true, message: "Password set successfully" });
        }

        // ── Mode 2: Token-based reset (forgot-password flow) ──
        if (!email) {
            return NextResponse.json({ error: "Email is required for token-based reset" }, { status: 400 });
        }
        const normalizedEmail = email.toLowerCase().trim();

        const verificationToken = await db.verificationToken.findUnique({ where: { token } });
        if (!verificationToken || verificationToken.identifier !== normalizedEmail) {
            return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
        }
        if (new Date() > verificationToken.expires) {
            await db.verificationToken.delete({ where: { token } });
            return NextResponse.json({ error: "Reset token has expired. Please request a new one." }, { status: 400 });
        }

        const user = await db.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await db.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
        await db.verificationToken.delete({ where: { token } });

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.error("Set password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
