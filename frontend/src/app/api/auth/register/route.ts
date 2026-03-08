import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json();

        if (!email || !name) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existing = await db.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
        }

        // Create new user
        const user = await db.user.create({
            data: {
                email: normalizedEmail,
                name: name.trim(),
                password: password || null,
                role: "customer",
            },
        });

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
        }, { status: 201 });
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
