/**
 * ZEMA service-token guard — used by internal API routes that the Zema360
 * Python agent layer calls from Alibaba Function Compute.
 *
 * Set ZEMA_SERVICE_TOKEN in your environment.  The Python MCP server sends
 *   Authorization: Bearer <ZEMA_SERVICE_TOKEN>
 * on every request.
 *
 * Routes also accept the CRON_SECRET for backward-compatibility with the
 * existing cron job pattern.
 */

const ZEMA_SERVICE_TOKEN = process.env.ZEMA_SERVICE_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

export function isZemaServiceRequest(request: Request): boolean {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return false;
    const token = auth.slice(7).trim();

    // Accept both the dedicated ZEMA token and the existing CRON_SECRET so
    // the escrow auto-release cron job continues to work without changes.
    if (ZEMA_SERVICE_TOKEN && token === ZEMA_SERVICE_TOKEN) return true;
    if (CRON_SECRET && token === CRON_SECRET) return true;
    return false;
}

/** Returns a 401 response or null if auth passed. */
export function requireZemaAuth(request: Request): Response | null {
    if (!isZemaServiceRequest(request)) {
        return new Response(
            JSON.stringify({ error: "Unauthorized — valid ZEMA_SERVICE_TOKEN required" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }
    return null;
}
