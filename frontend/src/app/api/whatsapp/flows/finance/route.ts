import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * WhatsApp Flow Webhook Endpoint
 * Target for: FairPrice_BNPL_PreApproval_v1
 */

const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

function verifySignature(payload: string, signature: string) {
    if (!signature || !WHATSAPP_APP_SECRET) {
        // Only allow bypass in development if secret is missing
        return process.env.NODE_ENV !== 'production';
    }
    
    try {
        const [algo, hash] = signature.split('=');
        if (algo !== 'sha256') return false;

        const hmac = crypto.createHmac('sha256', WHATSAPP_APP_SECRET);
        hmac.update(payload);
        const expected = hmac.digest('hex');
        
        // Constant time comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(expected, 'hex'),
            Buffer.from(hash, 'hex')
        );
    } catch (e) {
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-hub-signature-256") || "";

        if (!verifySignature(rawBody, signature)) {
            console.error("Invalid WhatsApp Flow Signature");
            return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const { action, data, user_phone } = payload;

        if (action === "ping") {
            return NextResponse.json({ version: "3.0", status: "pong" });
        }

        // 1. Resolve User
        const user = await prisma.user.findFirst({
            where: { whatsappNumber: user_phone }
        });

        // 2. Prepare Financing Record
        const financingData = {
            userId: user?.id || null,
            productId: data.product_id || null,
            loanAmount: parseFloat(data.loan_amount || "0"),
            tenureMonths: parseInt(data.tenure || "12"),
            monthlyRepayment: parseFloat(data.estimated_emi || "0"),
            interestRate: 3.5, // 3.5% monthly approx (from 36% p.a.)
            customerName: data.full_name || user?.name || "WhatsApp User",
            phoneNumber: user_phone,
            businessName: data.business_name || null,
            employmentStatus: data.employment_type || "salary_earner",
            source: "whatsapp_flow",
            status: "pending" as const
        };

        // 3. Save to DB
        const application = await prisma.financingApplication.create({
            data: financingData
        });

        // 4. Notifications
        await prisma.notification.create({
            data: {
                userId: "admin",
                type: "order",
                message: `📦 NEW BNPL LEAD: ${financingData.customerName} applied for ₦${financingData.loanAmount.toLocaleString()} via WhatsApp.`,
                link: `/admin/financing`
            }
        });

        // 5. Success response to Meta (Triggers SUCCESS_SCREEN)
        return NextResponse.json({
            version: "3.0",
            screen: "SUCCESS_SCREEN",
            data: {
                reference: application.id.substring(0, 8),
                message: "Application Received!"
            }
        });

    } catch (error) {
        console.error("WhatsApp Flow Error:", error);
        return NextResponse.json({ status: "error", message: "Internal Error" }, { status: 500 });
    }
}
