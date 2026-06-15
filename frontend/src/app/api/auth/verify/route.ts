import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
    try {
        const { email, password, whatsappNumber } = await req.json();
        
        if ((!email && !whatsappNumber) || !password) {
            return NextResponse.json({ success: false, error: "Email or WhatsApp number and password required" }, { status: 400 });
        }

        let user;

        if (whatsappNumber) {
            // WhatsApp-based login
            const cleanPhone = WhatsAppService.normalizePhoneNumber(whatsappNumber);
            user = await db.user.findUnique({ where: { whatsappNumber: cleanPhone } });
        } else {
            // Email-based login
            user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        }

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

        // Sign a JWT so the client can authenticate API calls
        const token = signToken({ userId: user.id, email: user.email, role: user.role as any });

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar_url: user.avatarUrl,
                whatsappNumber: user.whatsappNumber,
                created_at: user.createdAt?.toISOString(),
            }
        });
    } catch (error: any) {
        console.error("Auth verify error:", error);
        // DB offline — fall through to client-side fallback
        return NextResponse.json({ success: false, error: "Service unavailable", offline: true }, { status: 500 });
    }
}
