import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

// GET /api/admin/financing — list all applications (admin only)
export async function GET(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user || (user as any).role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = await Promise.resolve(searchParams.get('status'));
        const q = await Promise.resolve(searchParams.get('q'));

        const where: any = {};
        if (status && status !== 'all') where.status = status;
        if (q) {
            where.OR = [
                { customerName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { businessName: { contains: q, mode: 'insensitive' } },
            ];
        }

        const applications = await (prisma as any).financingApplication.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                type: true,
                status: true,
                customerName: true,
                email: true,
                businessName: true,
                phoneNumber: true,
                loanAmount: true,
                tenureMonths: true,
                monthlyRepayment: true,
                depositAmount: true,
                applicationType: true,
                contractType: true,
                productId: true,
                directorsJson: true,
                companyRegistrationNumber: true,
                createdAt: true,
                updatedAt: true,
                product: { select: { name: true, imageUrl: true, price: true } },
                user: { select: { id: true, name: true, email: true, phone: true } },
            }
        });

        return NextResponse.json({ success: true, applications });
    } catch (error: any) {
        console.error("Admin financing list error:", error);
        return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
    }
}
