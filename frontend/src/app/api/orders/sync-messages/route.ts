import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

export const runtime = "nodejs";

// POST /api/orders/sync-messages
// Sinks local messages to the database to ensure persistence & triggers admin notifications
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, sender, text, imageUrl, imageUrls, replyTo } = body;

        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        // 1. Fetch current order to get existing messages
        const order = await db.order.findUnique({
            where: { id: orderId },
            select: { chatMessages: true, zivaActive: true }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found in DB" }, { status: 404 });
        }

        // 2. Append new message
        const currentMessages = Array.isArray(order.chatMessages) ? [...order.chatMessages] : [];
        const newMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            sender,
            text,
            imageUrl,
            imageUrls,
            replyTo,
            timestamp: new Date().toISOString()
        };
        
        const updatedMessages = [...currentMessages, newMessage];

        // 3. Update order in DB
        const updatedOrder = await db.order.update({
            where: { id: orderId },
            data: {
                chatMessages: updatedMessages,
                zivaActive: sender === 'ziva' ? true : (sender === 'system' ? order.zivaActive : false),
                unreadAdmin: sender === 'user' || (sender === 'ziva' && text?.includes('ESCALATION')),
                updatedAt: new Date()
            }
        });

        // 4. Broadcast for real-time UI updates
        broadcast({ 
            type: "order_message_sync", 
            id: orderId, 
            sender,
            isEscalation: sender === 'ziva' && text?.includes('ESCALATION')
        });

        return NextResponse.json({ 
            success: true, 
            messageId: newMessage.id,
            unreadAdmin: updatedOrder.unreadAdmin 
        });

    } catch (error: any) {
        console.error("Order Message Sync Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
