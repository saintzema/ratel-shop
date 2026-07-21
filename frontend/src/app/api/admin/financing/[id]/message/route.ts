import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

/**
 * POST /api/admin/financing/[id]/message
 * Admin sends a message to the financing applicant via:
 *   1. Notification bell
 *   2. Inbox chat message (order concierge)
 *   3. Email
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = getUserFromRequest(req);
        if (!admin || (admin as any).role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { message, subject } = await req.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const application = await (prisma as any).financingApplication.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true } },
                product: { select: { name: true } },
            }
        });

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const customerId = application.userId;
        const customerName = application.customerName || application.user?.name || "Applicant";
        const customerEmail = application.email || application.user?.email;
        const productName = application.product?.name || "your product";

        const fullMessage = `📋 FairPrice Financing Update: ${message}`;

        // 1. Bell notification
        if (customerId) {
            await (prisma as any).notification.create({
                data: {
                    userId: customerId,
                    type: "financing",
                    message: fullMessage,
                    link: `/account/financing`,
                    read: false,
                }
            }).catch(() => {});
        }

        // 2. Inbox/chat message — create as a ChatMessage on the financing application
        //    (uses the existing orders/concierge inbox pattern if user ID is known)
        if (customerId) {
            await (prisma as any).chatMessage.create({
                data: {
                    senderId: "admin",
                    receiverId: customerId,
                    message: `[Financing — ${productName}]\n${message}`,
                    type: "text",
                    read: false,
                }
            }).catch(() => {});
        }

        // 3. Email
        if (customerEmail) {
            fetch(`${process.env.FAIRPRICE_URL || 'https://www.fairprice.ng'}/api/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: customerEmail,
                    type: 'FINANCING_ADMIN_MESSAGE',
                    payload: {
                        customerName,
                        subject: subject || 'Update on your FairPrice Financing Application',
                        message,
                        productName,
                        applicationId: id,
                        dashboardLink: `${process.env.FAIRPRICE_URL || 'https://www.fairprice.ng'}/account/financing`,
                        replyLink: `${process.env.FAIRPRICE_URL || 'https://www.fairprice.ng'}/account/inbox`,
                    }
                })
            }).catch(() => {});
        }

        // 4. Store the message in adminNotes log (append)
        const timestamp = new Date().toISOString();
        const currentNotes = application.adminNotes || "";
        const logEntry = `\n[${timestamp}] Admin → Customer: ${message}`;

        await (prisma as any).financingApplication.update({
            where: { id },
            data: { adminNotes: currentNotes + logEntry }
        }).catch(() => {});

        return NextResponse.json({ success: true, sent: { notification: !!customerId, email: !!customerEmail } });
    } catch (error: any) {
        console.error("Financing message error:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
