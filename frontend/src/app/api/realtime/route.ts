import { NextResponse } from "next/server";

// Simple in-memory client list for SSE
// In a production environment with multiple server instances, 
// you'd use Redis or a similar external message broker.
let clients: Set<ReadableStreamDefaultController> = new Set();

export async function GET() {
    const stream = new ReadableStream({
        start(controller) {
            clients.add(controller);
            // Send initial heartbeat
            controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        },
        cancel(controller) {
            clients.delete(controller);
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}

// Helper to broadcast messages to all connected SSE clients
export function broadcast(data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    clients.forEach(client => {
        try {
            client.enqueue(encoder.encode(message));
        } catch (e) {
            clients.delete(client);
        }
    });
}
