// In-memory client set — works in a single serverless instance.
// Multiple Vercel instances won't share this, but the polling fallback in
// each client compensates for missed real-time pushes.
export const clients: Set<ReadableStreamDefaultController> = new Set();

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
