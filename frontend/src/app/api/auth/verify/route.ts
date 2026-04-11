import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
        }

        const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" });
        }

        if (!user.password) {
            // User exists but has no password set (e.g. OAuth-only user)
            return NextResponse.json({ success: false, error: "No password set. Use email code or social login." });
        }

        const bcryptMod = await import("bcryptjs");
        const bcrypt = 'default' in bcryptMod ? bcryptMod.default : bcryptMod;
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return NextResponse.json({ success: false, error: "Incorrect password" });
        }

        // Return user data (sans password) on success
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar_url: user.avatarUrl,
                created_at: user.createdAt?.toISOString(),
            }
        });
    } catch (error: any) {
        console.error("Auth verify error:", error);
        // DB offline — fall through to client-side fallback
        return NextResponse.json({ success: false, error: "Service unavailable", offline: true }, { status: 503 });
    }
}
