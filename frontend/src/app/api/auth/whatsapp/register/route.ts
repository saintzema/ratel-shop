import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

/**
 * POST /api/auth/whatsapp/register
 * Registers a new user via WhatsApp number.
 * Expects: { phoneNumber, name, password, email? }
 * Creates a user with the WA number, hashes password, auto-generates email if not provided.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phoneNumber, name, password, email } = body;

        if (!phoneNumber || !name || !password) {
            return NextResponse.json(
                { error: "Phone number, name, and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        const cleanPhone = WhatsAppService.normalizePhoneNumber(phoneNumber);

        // Check if this WhatsApp number is already taken
        const existingWa = await db.user.findUnique({
            where: { whatsappNumber: cleanPhone }
        });
        if (existingWa) {
            return NextResponse.json(
                { error: "This WhatsApp number is already registered. Please sign in instead." },
                { status: 409 }
            );
        }

        // Determine email — use provided or auto-generate
        const userEmail = email?.trim()?.toLowerCase() || `wa_${cleanPhone}@fairprice.ng`;

        // Check if this email is already taken (could happen if user previously used email flow)
        const existingEmail = await db.user.findUnique({
            where: { email: userEmail }
        });

        if (existingEmail) {
            // If the existing email user has no WA number, link them
            if (!existingEmail.whatsappNumber) {
                const hashedPassword = await bcrypt.hash(password, 12);
                const updatedUser = await db.user.update({
                    where: { id: existingEmail.id },
                    data: {
                        whatsappNumber: cleanPhone,
                        name: name.trim(),
                        password: hashedPassword,
                    }
                });

                const token = signToken({
                    userId: updatedUser.id,
                    email: updatedUser.email,
                    role: updatedUser.role,
                });

                return NextResponse.json({
                    success: true,
                    token,
                    user: {
                        id: updatedUser.id,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        role: updatedUser.role,
                        whatsappNumber: cleanPhone,
                        avatar_url: updatedUser.avatarUrl,
                        created_at: updatedUser.createdAt.toISOString(),
                    }
                }, { status: 201 });
            }

            return NextResponse.json(
                { error: "An account with this email already exists." },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        const user = await db.user.create({
            data: {
                email: userEmail,
                name: name.trim(),
                password: hashedPassword,
                whatsappNumber: cleanPhone,
                role: "customer",
            }
        });

        // Generate JWT
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                whatsappNumber: cleanPhone,
                avatar_url: user.avatarUrl,
                created_at: user.createdAt.toISOString(),
            }
        }, { status: 201 });
    } catch (error: any) {
        console.error("WhatsApp Register Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
