import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../realtime/route";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const updateData: any = {};
        
        if (body.id !== undefined) updateData.id = body.id;
        if (body.email !== undefined) updateData.email = body.email;
        if (body.name !== undefined) updateData.name = body.name;
        if (body.role !== undefined) updateData.role = body.role;
        if (body.avatar_url !== undefined) updateData.avatarUrl = body.avatar_url;
        if (body.location !== undefined) updateData.location = body.location;
        if (body.birthday !== undefined) updateData.birthday = body.birthday;
        if (body.phone !== undefined) updateData.phone = body.phone;
        if (body.address !== undefined) updateData.address = body.address;

        if (body.password) {
            const bcryptStr = await import("bcryptjs");
            // Workaround for module loading in edge/node
            const bcrypt = 'default' in bcryptStr ? bcryptStr.default : bcryptStr;
            updateData.password = await bcrypt.hash(body.password, 12);
        }

        const createData = {
            id: body.id || `user_${body.email}`,
            email: body.email,
            name: body.name || "User",
            role: body.role || "customer",
            avatarUrl: body.avatar_url,
            location: body.location,
            birthday: body.birthday,
            phone: body.phone,
            address: body.address,
            password: updateData.password, // already hashed above if provided
        };

        const user = await db.user.upsert({
            where: { email: body.email },
            update: updateData,
            create: createData,
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
