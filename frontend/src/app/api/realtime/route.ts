import { NextResponse } from "next/server";
import { clients } from "@/lib/realtime-service";

// Vercel serverless functions time out after 300s.
// We bound the SSE connection to 25s and send a "reconnect" event so the
// client's native EventSource auto-reconnect loop takes over cleanly.
const MAX_DURATION_MS = 25_000;

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

