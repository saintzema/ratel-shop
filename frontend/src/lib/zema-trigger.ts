/**
 * ZEMA 360 — UiPath Maestro BPMN trigger.
 *
 * Fires the autonomous order pipeline (Inventory → Fulfillment → Finance →
 * WhatsApp HITL → Escrow → Notify) when a new order is placed.
 *
 * Design rules:
 *  - Never throw. A UiPath outage must NEVER block or fail order placement.
 *  - No-op (silently) when env vars are absent, so local/dev and non-configured
 *    environments behave normally.
 *  - Short timeout so a hung UiPath endpoint can't tie up the function.
 *
 * Configure via env (set in Vercel project settings, never in code):
 *   UIPATH_TRIGGER_URL  — the API Trigger URL from Orchestrator
 *   UIPATH_TOKEN        — Personal Access Token (Bearer)
 *
 * Call from an order-creation handler via `after()` (next/server) so it runs
 * after the response is sent without delaying the buyer.
 */
export async function triggerZema360(orderId: string): Promise<void> {
    const url = process.env.UIPATH_TRIGGER_URL;
    const token = process.env.UIPATH_TOKEN;

    if (!url || !token) {
        // Not configured — nothing to do. (Keeps dev + unconfigured envs clean.)
        return;
    }
    if (!orderId) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            // UiPath API Triggers require inputArguments envelope — flat body is ignored
            body: JSON.stringify({ inputArguments: { orderId } }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            console.error(`[zema360] trigger failed [${res.status}] for ${orderId}: ${detail.slice(0, 300)}`);
            return;
        }
        console.log(`[zema360] pipeline triggered for order ${orderId}`);
    } catch (err: any) {
        // AbortError, network error, etc. — non-blocking by design.
        console.error(`[zema360] trigger error for ${orderId} (non-blocking):`, err?.message ?? err);
    } finally {
        clearTimeout(timeout);
    }
}
