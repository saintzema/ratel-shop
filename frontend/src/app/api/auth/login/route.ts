import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Find user in database
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { seller: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // If user has no password set, deny access — they must set one first
        if (!user.password) {
            return NextResponse.json({ error: "Please set a password for your account first" }, { status: 401 });
        }

        // Compare using bcrypt (handles both hashed and legacy plaintext gracefully)
        const isHashed = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
        let isValid = false;

        if (isHashed) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            // Legacy plaintext comparison — upgrade to hash on successful match
            isValid = password === user.password;
            if (isValid) {
                const hashed = await bcrypt.hash(password, 12);
                await db.user.update({ where: { id: user.id }, data: { password: hashed } });
            }
        }

        if (!isValid) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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
