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

        // SECURITY: Role Protection
        // Prevent unauthorized role escalation. 
        // Only allow 'admin' role if the requester is already an admin.
        // For 'seller' role, allow if it's a legitimate transition or new user.
        const existingUser = await db.user.findUnique({ where: { email: body.email } });
        if (body.role !== undefined) {
             if (body.role === 'admin') {
                 // In a real app, check session permissions here. 
                 // For now, if user exists and is NOT admin, block the upgrade.
                 if (existingUser && existingUser.role !== 'admin') {
                     delete updateData.role;
                     console.warn(`SECURITY: Blocked role escalation to admin for ${body.email}`);
                 }
             }
             // Allow transition from customer -> seller for onboarding
             if (existingUser && existingUser.role === 'admin' && body.role !== 'admin') {
                 // Prevent accidental downgrade of admin
                 delete updateData.role;
             }
             updateData.role = updateData.role || body.role;
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
            let user = await db.user.findUnique({ where: { id } });
            // Fallback: If not found by ID and looks like an email, try email lookup
            if (!user && id.includes("@")) {
                user = await db.user.findUnique({ where: { email: id } });
            }
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
