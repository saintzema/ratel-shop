import { NextResponse } from "next/server";

// Vercel serverless functions time out after 300s.
// We bound the SSE connection to 25s and send a "reconnect" event so the
// client's native EventSource auto-reconnect loop takes over cleanly.
const MAX_DURATION_MS = 25_000;

// In-memory client set — works in a single serverless instance.
// Multiple Vercel instances won't share this, but the polling fallback in
// each client compensates for missed real-time pushes.
let clients: Set<ReadableStreamDefaultController> = new Set();

export async function GET() {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            clients.add(controller);
            // Initial heartbeat so the browser knows the connection is live
            controller.enqueue(encoder.encode(": heartbeat\n\n"));

            // Close the connection before Vercel's 300s hard limit.
            // The browser's EventSource will automatically reconnect.
            const timer = setTimeout(() => {
                try {
                    controller.enqueue(encoder.encode("event: reconnect\ndata: {}\n\n"));
                    controller.close();
                } catch {
                    // already closed
                }
                clients.delete(controller);
            }, MAX_DURATION_MS);

            // Store the timer on the controller so cancel() can clear it
            (controller as any)._timer = timer;
        },
        cancel(controller) {
            clearTimeout((controller as any)._timer);
            clients.delete(controller);
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
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
        } catch {
            clients.delete(client);
        }
    });
}
