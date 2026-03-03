import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../realtime/route";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const userData = {
            id: body.id,
            email: body.email,
            name: body.name,
            role: (body.role as any) || "customer",
            avatarUrl: body.avatar_url,
            location: body.location,
            birthday: body.birthday,
        };

        const user = await db.user.upsert({
            where: { email: userData.email },
            update: userData,
            create: userData,
        });

        // Broadcast update for real-time sync
        broadcast({ type: "user_updated", id: user.id });

        return NextResponse.json(user);
    } catch (error: any) {
        console.error("User creation error:", error);
        return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const id = searchParams.get("id");

    try {
        if (id) {
            const user = await db.user.findUnique({ where: { id } });
            return NextResponse.json(user);
        }
        if (email) {
            const user = await db.user.findUnique({ where: { email } });
            return NextResponse.json(user);
        }
        const users = await db.user.findMany();
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
