import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

/**
 * Web-based Financing Application Endpoint
 */

export async function POST(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { productId, type, loanAmount, tenureMonths, monthlyRepayment, interestRate } = body;

        if (!loanAmount || !tenureMonths || !monthlyRepayment) {
            return NextResponse.json({ error: "Missing required financing details" }, { status: 400 });
        }

        // 1. Create Application
        const application = await (prisma as any).financingApplication.create({
            data: {
                userId: user.userId,
                productId: productId || null,
                type: type === 'business' ? 'business' : 'individual',
                status: "pending",
                loanAmount: parseFloat(loanAmount),
                tenureMonths: parseInt(tenureMonths),
                monthlyRepayment: parseFloat(monthlyRepayment),
                interestRate: parseFloat(interestRate || "36"),
                source: "web",
                customerName: (user as any).name,
                email: (user as any).email
            }
        });

            const notifyAdmin = async () => {
                const customerName = (user as any).name || "A customer";
                await (prisma as any).notification.create({
                    data: {
                        userId: "admin",
                        type: "financing",
                        message: `🏦 NEW WEB BNPL APPLICATION: ${customerName} applied for ₦${loanAmount.toLocaleString()}.`,
                        link: `/admin/financing`
                    }
                }).catch((e: any) => console.error("Admin notification failed:", e));
            };
            notifyAdmin();

        return NextResponse.json({
            success: true,
            applicationId: application.id
        });

    } catch (error: any) {
        console.error("Financing Application Error:", error);
        return NextResponse.json({ error: "Application failed" }, { status: 500 });
    }
}
