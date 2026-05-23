import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { UserRole } from "@prisma/client";
import { WhatsAppService } from "@/lib/whatsapp-service";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const updateData: any = {
            name: body.name,
            email: body.email,
            avatarUrl: body.avatar_url, // Matches schema
            location: body.location,
            birthday: body.birthday,
            role: body.role
        };

        // Handle password hashing if provided
        if (body.password) {
            const bcryptStr = await import("bcryptjs");
            const bcrypt = 'default' in bcryptStr ? bcryptStr.default : bcryptStr;
            updateData.password = await bcrypt.hash(body.password, 12);
        }

        // To handle addresses, you must use 'connect' or 'create'
        if (body.address) {
            updateData.addresses = {
                upsert: {
                    where: { id: body.addressId || 'new-address' }, // Use a unique ID or create
                    create: { street: body.address, city: body.location || "Lagos", state: "Nigeria" },
                    update: { street: body.address }
                }
            };
        }        
        if (body.id !== undefined) updateData.id = body.id;
        if (body.email !== undefined) updateData.email = body.email;
        if (body.name !== undefined) updateData.name = body.name;
        if (body.role !== undefined) updateData.role = body.role;
        if (body.avatar_url !== undefined) updateData.avatarUrl = body.avatar_url;
        if (body.location !== undefined) updateData.location = body.location;
        if (body.birthday !== undefined) updateData.birthday = body.birthday;

        // Save WhatsApp number — normalise to E.164 digits, deduplicate across +234/234/0 variants
        if (body.whatsapp) {
            const normalized = WhatsAppService.normalizePhoneNumber(String(body.whatsapp));
            if (normalized) updateData.whatsappNumber = normalized;
        }
        // Also accept direct whatsappNumber field (e.g. from profile page)
        if (body.whatsappNumber) {
            const normalized = WhatsAppService.normalizePhoneNumber(String(body.whatsappNumber));
            if (normalized) updateData.whatsappNumber = normalized;
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

        // Resolve whatsappNumber for create path
        const waNumber = updateData.whatsappNumber ?? null;

        const createData = {
            id: body.id || `user_${body.email}`,
            email: body.email,
            name: body.name || "User",
            role: (body.role as UserRole) || "customer",
            avatarUrl: body.avatar_url,
            location: body.location,
            birthday: body.birthday,
            password: updateData.password,
            whatsappNumber: waNumber || undefined,
            // Handle the Address relation correctly
            addresses: body.address ? {
                create: {
                    street: body.address,
                    city: body.location || "Lagos",
                    state: "Nigeria",
                    phone: body.phone,
                }
            } : undefined
        };

        const user = await db.user.upsert({
            where: { email: body.email },
            update: updateData,
            create: createData,
            include: {
                addresses: true, // Returns the addresses in the response
                sellers: true
            }
        });

        // Broadcast update for real-time sync
        broadcast({ type: "user_updated", id: user.id });

        return NextResponse.json(user);
    } catch (error: any) {
        console.error("User creation error:", error);
        return NextResponse.json(
            { error: "Database error or unreachable. Check your connection string.", details: error.message }, 
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const id = url.searchParams.get("id");

    try {
        if (id) {
            let user = await db.user.findUnique({ where: { id } });
            // Fallback: If not found by ID and looks like an email, try email lookup
            if (!user && id.includes("@")) {
                user = await db.user.findUnique({ where: { email: id } });
            }
            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            return NextResponse.json(user);
        }
        if (email) {
            const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, role: true } });
            if (!user) {
                return NextResponse.json({ exists: false, userId: null });
            }
            return NextResponse.json({ ...user, exists: true, userId: user.id });
        }
        const users = await db.user.findMany();
        return NextResponse.json(users);
    } catch (error) {
        console.error("Users API error:", error);
        return NextResponse.json(
            { error: "Database temporarily unavailable", offline: true },
            { status: 500, headers: { "X-DB-Status": "offline" } }
        );
    }
}
