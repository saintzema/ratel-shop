import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await db.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            // For security, don't reveal if user exists. 
            // Just return success as if we sent it.
            return NextResponse.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
        }

        // Generate token
        const token = uuidv4();
        const expires = new Date(Date.now() + 3600000); // 1 hour expiration

        // Save to DB
        await db.verificationToken.upsert({
            where: {
                identifier_token: {
                    identifier: normalizedEmail,
                    token: token
                }
            },
            update: {
                token: token,
                expires: expires
            },
            create: {
                identifier: normalizedEmail,
                token: token,
                expires: expires
            }
        });

        // Send Email
        const resetLink = `${process.env.NEXTAUTH_URL || 'https://fairprice.ng'}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
        
        await fetch(`${process.env.NEXTAUTH_URL || 'https://fairprice.ng'}/api/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: normalizedEmail,
                type: "CHANGE_PASSWORD",
                payload: { 
                    name: user.name || normalizedEmail.split("@")[0],
                    resetLink: resetLink 
                }
            })
        });

        return NextResponse.json({ success: true, message: "Password reset link sent successfully." });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
