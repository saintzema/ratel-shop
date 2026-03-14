import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Find user in database
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { seller: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // Verify password using bcrypt if one is stored
        if (user.password && password) {
            const bcrypt = await import("bcryptjs");
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
            }
        } else if (!user.password && password) {
             // For users who signed up via OAuth without a password but are trying to use password login
             return NextResponse.json({ error: "Invalid email or password. Try signing in with Google or Apple." }, { status: 401 });
        }

        // Generate JWT
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar_url: user.avatarUrl,
                location: user.location,
                birthday: user.birthday,
                created_at: user.createdAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
