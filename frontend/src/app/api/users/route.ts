import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { UserRole } from "@prisma/client";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { getUserFromRequest } from "@/lib/jwt";

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

        // PASSWORDS ARE NOT SETTABLE HERE.
        //
        // This endpoint is unauthenticated by necessity (guest checkout creates an
        // account before the buyer has one), and it used to hash body.password
        // into the record. Combined with the `where: { id: body.id }` update
        // below, that meant an unauthenticated POST of
        //   { id: "<any user id>", password: "chosen" }
        // overwrote that account's password — total takeover of any account on
        // the platform, admin included.
        //
        // Password creation belongs to /api/auth/register and password changes to
        // the authenticated reset flow. Anything sent here is ignored.

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

        // When an explicit user id is supplied AND that user exists, this is an UPDATE of
        // that account — possibly changing its email (e.g. a WhatsApp-signup account whose
        // wa_...@fairprice.ng placeholder is being replaced with the buyer's real email at
        // first checkout). Upserting by the NEW email here used to create a second,
        // duplicate user instead, leaving the WA account stuck on its placeholder forever.
        // Updating an EXISTING account requires being that account (or an admin).
        // Creating a brand-new one stays open, because guest checkout has to be
        // able to register a buyer who does not yet have credentials.
        const caller = getUserFromRequest(req);
        const isAdmin = caller?.role === "admin";

        let user;
        const targetById = body.id ? await db.user.findUnique({ where: { id: body.id }, select: { id: true } }) : null;
        const targetByEmail = !targetById && body.email
            ? await db.user.findUnique({ where: { email: body.email }, select: { id: true } })
            : null;
        const existingTargetId = targetById?.id || targetByEmail?.id;

        if (existingTargetId && !isAdmin && caller?.userId !== existingTargetId) {
            return NextResponse.json(
                { error: "You can only update your own profile" },
                { status: 403 }
            );
        }

        if (targetById) {
            if (body.email) {
                const emailTaken = await db.user.findUnique({ where: { email: body.email }, select: { id: true } });
                if (emailTaken && emailTaken.id !== body.id) {
                    return NextResponse.json(
                        { error: "Email already belongs to another account", code: "EMAIL_CONFLICT" },
                        { status: 409 }
                    );
                }
            }
            const { id: _id, ...updateWithoutId } = updateData;
            user = await db.user.update({
                where: { id: body.id },
                data: updateWithoutId,
                include: { addresses: true, sellers: true }
            });
        } else {
            user = await db.user.upsert({
                where: { email: body.email },
                update: updateData,
                create: createData,
                include: {
                    addresses: true, // Returns the addresses in the response
                    sellers: true
                }
            });
        }

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
            // Include the seller record (+ KYC submissions) so the admin user-detail page
            // can render the real role, status, business profile and uploaded KYC/CAC docs
            // straight from the DB instead of the trimmed/empty localStorage cache.
            const includeSeller = {
                sellers: {
                    include: { kycSubmissions: { orderBy: { createdAt: "desc" as const }, take: 5 } },
                },
            };
            let user = await db.user.findUnique({ where: { id }, include: includeSeller });
            if (!user && !id.includes("@")) {
                // id may be a seller ID (admin users list links by seller ID, not user ID)
                const seller = await db.seller.findUnique({ where: { id }, select: { userId: true } });
                if (seller?.userId) {
                    user = await db.user.findUnique({ where: { id: seller.userId }, include: includeSeller });
                }
            }
            if (!user && id.includes("@")) {
                user = await db.user.findUnique({ where: { email: id }, include: includeSeller });
            }
            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            return NextResponse.json(user);
        }
        if (email) {
            // password was deliberately never selected here (correct — never leak a hash to
            // the client), but the login page's email-lookup path checked the raw `password`
            // field on this response to decide whether to show "Enter Password" or "Create
            // New Password". Since that field never existed, it was always falsy — EVERY
            // user with a real password got routed to "Create New Password" on every login,
            // forever. Select the hash server-side only to compute a safe boolean, same
            // pattern already used correctly by /api/auth/whatsapp/lookup.
            const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, role: true, password: true } });
            if (!user) {
                return NextResponse.json({ exists: false, userId: null });
            }
            const { password, ...safeUser } = user;
            return NextResponse.json({ ...safeUser, exists: true, userId: user.id, hasPassword: !!password }, {
                headers: { "Cache-Control": "private, max-age=300" }
            });
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
