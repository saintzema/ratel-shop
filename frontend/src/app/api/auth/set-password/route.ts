import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST /api/auth/set-password — Set or update a user's password (hashed) with token verification
export async function POST(request: Request) {
    try {
        const { email, password, token } = await request.json();

        if (!email || !password || !token) {
            return NextResponse.json({ error: "Email, password, and token are required" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Verify Token
        const verificationToken = await db.verificationToken.findUnique({
            where: { token }
        });

        if (!verificationToken || verificationToken.identifier !== normalizedEmail) {
            return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
        }

        if (new Date() > verificationToken.expires) {
            await db.verificationToken.delete({ where: { token } });
            return NextResponse.json({ error: "Reset token has expired" }, { status: 400 });
        }

        // 2. Find User
        const user = await db.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 3. Hash and store
        const hashedPassword = await bcrypt.hash(password, 12);
        await db.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // 4. Delete Token after use
        await db.verificationToken.delete({ where: { token } });

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.error("Set password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
