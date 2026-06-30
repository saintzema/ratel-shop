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
    if (!orderId) return;
    const url = process.env.UIPATH_TRIGGER_URL;
    const token = process.env.UIPATH_TOKEN;

    // ── Path A: UiPath Maestro BPMN (full agentic pipeline) when configured ──
    if (url && token) {
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
            if (res.ok) {
                console.log(`[zema360] pipeline triggered for order ${orderId}`);
                return; // BPMN will call /process-order itself — don't double-fire HITL.
            }
            const detail = await res.text().catch(() => "");
            console.error(`[zema360] UiPath trigger failed [${res.status}] for ${orderId}: ${detail.slice(0, 300)} — using direct fallback`);
        } catch (err: any) {
            console.error(`[zema360] UiPath trigger error for ${orderId} (falling back):`, err?.message ?? err);
        } finally {
            clearTimeout(timeout);
        }
    }

    // ── Path B: Direct fallback ──
    // UiPath absent or unreachable — fire the Human-In-The-Loop approval DIRECTLY so the
    // WhatsApp approval request still reaches the approver. Guarantees HITL works on every
    // new order (and in a live demo) without depending on UiPath being online. This is
    // independent of the per-seller auto-payout setting, which only governs QR/direct payouts.
    await directHitlFallback(orderId);
}

async function directHitlFallback(orderId: string): Promise<void> {
    const site = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";
    const svcToken = process.env.ZEMA_SERVICE_TOKEN;
    const controller = new AbortController();
    // Generous: stepHitlRequest fetches Gemini market-intel and sends WhatsApp before returning.
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
        const res = await fetch(`${site}/api/zema360/process-order`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(svcToken ? { Authorization: `Bearer ${svcToken}` } : {}),
            },
            body: JSON.stringify({ step: "hitl_request", orderId, agentDecision: { source: "direct_fallback" } }),
            signal: controller.signal,
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            console.error(`[zema360] direct HITL fallback failed [${res.status}] for ${orderId}: ${detail.slice(0, 300)}`);
            return;
        }
        console.log(`[zema360] direct HITL fallback fired for order ${orderId}`);
    } catch (err: any) {
        console.error(`[zema360] direct HITL fallback error for ${orderId} (non-blocking):`, err?.message ?? err);
    } finally {
        clearTimeout(timeout);
    }
}
