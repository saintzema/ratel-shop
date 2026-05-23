import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

// GET /api/admin/financing/[id] — full application detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getUserFromRequest(req);
        if (!user || (user as any).role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const application = await (prisma as any).financingApplication.findUnique({
            where: { id },
            include: {
                product: { select: { name: true, imageUrl: true, price: true, category: true } },
                user: { select: { id: true, name: true, email: true, phone: true, whatsappNumber: true, createdAt: true } },
            }
        });

        if (!application) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, application });
    } catch (error: any) {
        console.error("Admin financing detail error:", error);
        return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
    }
}

// PATCH /api/admin/financing/[id] — update status or notes
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getUserFromRequest(req);
        if (!user || (user as any).role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { status, adminNotes } = body;

        const updates: any = {};
        if (status) updates.status = status;
        if (adminNotes !== undefined) updates.adminNotes = adminNotes;

        const application = await (prisma as any).financingApplication.update({
            where: { id },
            data: updates,
            include: {
                user: { select: { id: true, name: true, email: true } },
                product: { select: { name: true } },
            }
        });

        // Notify customer of status change
        if (status && application.userId) {
            const statusMessages: Record<string, string> = {
                under_review: `📋 Your financing application is now under review. We'll get back to you shortly.`,
                approved: `✅ Great news! Your financing application has been approved. Our team will be in touch with next steps.`,
                rejected: `❌ Unfortunately your financing application was not approved at this time. Please contact us for more information.`,
                pending: `🔄 Your financing application has been updated. Please check your inbox for details.`,
            };

            const message = statusMessages[status];
            if (message) {
                await (prisma as any).notification.create({
                    data: {
                        userId: application.userId,
                        type: "financing",
                        message,
                        link: `/account/financing`,
                        read: false,
                    }
                }).catch(() => {});

                // Email the customer
                if (application.email) {
                    fetch(`${process.env.NEXTAUTH_URL || 'https://www.fairprice.ng'}/api/email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: application.email,
                            type: 'FINANCING_STATUS_UPDATE',
                            payload: {
                                customerName: application.customerName || 'Applicant',
                                status,
                                message,
                                productName: application.product?.name || 'your product',
                                applicationId: id,
                                dashboardLink: `${process.env.NEXTAUTH_URL || 'https://www.fairprice.ng'}/account/financing`,
                            }
                        })
                    }).catch(() => {});
                }
            }
        }

        return NextResponse.json({ success: true, application });
    } catch (error: any) {
        console.error("Admin financing update error:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
