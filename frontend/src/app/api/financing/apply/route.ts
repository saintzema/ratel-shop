import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

export async function POST(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            productId, productName, type,
            loanAmount, tenureMonths, monthlyRepayment, interestRate, depositAmount,
            applicationType, contractType,
            signatureDataUrl,
            // Business owner extras
            companyName, companyRegistrationNumber, companyLogoBase64, directorsJson,
            auditData, payslipData
        } = body;

        if (!loanAmount || !tenureMonths || !monthlyRepayment) {
            return NextResponse.json({ error: "Missing required financing details" }, { status: 400 });
        }

        const customerName = (user as any).name || "Applicant";
        const customerEmail = (user as any).email;

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
                depositAmount: parseFloat(depositAmount || "0"),
                source: "web",
                customerName,
                email: customerEmail,
                applicationType: applicationType || null,
                contractType: contractType || null,
                // Signature
                signatureDataUrl: signatureDataUrl || null,
                // Business owner
                businessName: companyName || null,
                companyRegistrationNumber: companyRegistrationNumber || null,
                companyLogoBase64: companyLogoBase64 || null,
                directorsJson: directorsJson || null,
                // Legacy
                auditData: auditData || null,
                payslipData: payslipData || null,
            }
        });

        // Notify admin — bell + link to detail page
        const amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(loanAmount);
        const appType = type === 'business' ? 'Business' : 'Individual';

        await (prisma as any).notification.create({
            data: {
                userId: "admin",
                type: "financing",
                message: `🏦 New ${appType} Financing Application from ${customerName} — ${amount} for ${productName || 'a product'}`,
                link: `/admin/financing/${application.id}`,
                read: false,
            }
        }).catch((e: any) => console.error("Admin notification failed:", e));

        // Email admin
        const adminEmail = process.env.ADMIN_EMAIL || "admin@fairprice.ng";
        fetch(`${process.env.FAIRPRICE_URL || 'https://www.fairprice.ng'}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: adminEmail,
                type: 'ADMIN_NEW_FINANCING',
                payload: {
                    customerName,
                    customerEmail,
                    amount,
                    productName: productName || 'N/A',
                    applicationType: appType,
                    applicationId: application.id,
                    reviewLink: `${process.env.FAIRPRICE_URL || 'https://www.fairprice.ng'}/admin/financing/${application.id}`,
                }
            })
        }).catch(() => { /* non-critical */ });

        return NextResponse.json({ success: true, applicationId: application.id });

    } catch (error: any) {
        console.error("Financing Application Error:", error);
        return NextResponse.json({ error: "Application failed" }, { status: 500 });
    }
}
