import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { isDynamoConfigured, ensureTable, writeAgentLog } from "@/lib/dynamodb";

export const dynamic = "force-dynamic";

const SITE = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";
const APPROVER_WA = process.env.ZEMA_APPROVER_WHATSAPP || "+2348162816305";

// ── Auth guard ────────────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest) {
    const token = process.env.ZEMA_SERVICE_TOKEN;
    if (!token) return true; // no token set → open (dev only)
    return req.headers.get("authorization") === `Bearer ${token}`;
}

// ── DynamoDB log (fire-and-forget) ────────────────────────────────────────────
async function log(agent: string, event: string, status: string, payload?: any, orderId?: string) {
    if (!isDynamoConfigured()) return;
    try {
        await ensureTable();
        await writeAgentLog({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            agent,
            event,
            status: status as any,
            payload,
            orderId,
            ts: Date.now(),
        });
    } catch { /* non-critical */ }
}

// ── Step handlers ─────────────────────────────────────────────────────────────

async function stepInventory(orderId: string) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        include: { product: { select: { id: true, name: true, stock: true } } },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    const stock = order.product.stock ?? 0;
    if (stock < order.quantity) {
        await log("InventoryAgent", "stock_insufficient", "failed", { stock, required: order.quantity }, orderId);
        return { ok: false, error: "insufficient_stock", stock_available: stock, required: order.quantity };
    }

    await db.product.update({
        where: { id: order.productId },
        data: { stock: { decrement: order.quantity } },
    });
    await log("InventoryAgent", `Stock decremented: ${order.product.name} −${order.quantity}`, "completed", { stock_remaining: stock - order.quantity }, orderId);
    return { ok: true, product: order.product.name, stock_remaining: stock - order.quantity };
}

async function stepFulfillment(orderId: string) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        select: { trackingId: true, carrier: true },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    // idempotent — already fulfilled
    if (order.trackingId) {
        return { ok: true, tracking_id: order.trackingId, carrier: order.carrier ?? "Unknown", already_fulfilled: true };
    }

    const trackingId = `FP${Date.now().toString(36).toUpperCase()}`;
    const carriers = ["GIG Logistics", "DHL Nigeria", "Jumia Logistics", "RedStar Express"];
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];

    try {
        await db.order.update({
            where: { id: orderId },
            data: {
                trackingId,
                carrier,
                trackingStatus: "shipped",
                trackingSteps: [
                    { status: "Order confirmed", ts: new Date().toISOString() },
                    { status: "Picked up by carrier", ts: new Date().toISOString() },
                ],
            },
        });
    } catch (dbErr: any) {
        return { ok: false, error: "db_update_failed", detail: dbErr?.message ?? String(dbErr) };
    }

    await log("FulfillmentAgent", `Tracking assigned: ${trackingId} via ${carrier}`, "completed", { trackingId, carrier }, orderId);
    return { ok: true, tracking_id: trackingId, carrier };
}

async function stepFinance(orderId: string) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        select: { amount: true, escrowStatus: true, quantity: true },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    const verified = order.escrowStatus === "held";
    await log("FinanceAgent", `Escrow verified: ₦${order.amount.toLocaleString()} — status: ${order.escrowStatus}`, verified ? "completed" : "failed", { amount: order.amount, escrow_status: order.escrowStatus }, orderId);
    return { ok: verified, amount: order.amount, escrow_status: order.escrowStatus, currency: "NGN" };
}

// ZEMA 360 — Gemini-powered market intelligence for the human approver.
// Calls /api/gemini-price (Gemini primary, Qwen fallback — same engine as the
// FairPrice Price Checker) and returns a one-line verdict comparing the order
// price to the live market price. Best-effort: any failure returns null and the
// approval is sent without it, so this never blocks or breaks the HITL step.
async function getMarketIntel(productName: string | undefined, amount: number): Promise<string | null> {
    if (!productName) return null;
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(`${SITE}/api/gemini-price`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productName, mode: "search" }),
            signal: ctrl.signal,
        }).finally(() => clearTimeout(t));
        if (!res.ok) return null;
        const provider = res.headers.get("x-provider") === "qwen" ? "Qwen" : "Gemini";
        const data = await res.json();
        const market = data?.suggestions?.[0]?.approxPrice;
        if (!market || market <= 0) return null;
        const ratio = amount / market;
        const verdict = ratio <= 0.95 ? "good deal ✅" : ratio <= 1.1 ? "fair price" : "above market ⚠️";
        return `🤖 *AI market intel (${provider})*\nMarket ~₦${Math.round(market).toLocaleString()} · ${verdict}`;
    } catch {
        return null;
    }
}

async function stepHitlRequest(orderId: string, agentDecision: any) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        include: { product: { select: { name: true } }, seller: { select: { businessName: true } } },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    // runId is the short, uppercase, human-typable handle (e.g. RUN-MQRLIY1S).
    // It's what the approver replies with and what UiPath polls — no extra column.
    const runId = `RUN-${Date.now().toString(36).toUpperCase()}`;
    const approval = await db.zemaApprovalRequest.create({
        data: {
            runId,
            orderId,
            status: "pending",
            agentDecision: JSON.stringify(agentDecision ?? {}),
        },
    });

    // Gemini-powered market intelligence (best-effort) to inform the approver.
    const intel = await getMarketIntel(order.product?.name ?? undefined, Number(order.amount));

    const msg =
        `🛍️ *ZEMA 360 — Human Approval Required*\n\n` +
        `Order: *${order.id.slice(-8).toUpperCase()}*\n` +
        `Product: ${order.product?.name ?? "—"}\n` +
        `Seller: ${order.seller?.businessName ?? "—"}\n` +
        `Amount: *₦${Number(order.amount).toLocaleString()}*\n` +
        `Escrow: held ✅\n` +
        (intel ? `\n${intel}\n` : ``) +
        `\nReply:\n✅ *approve ${runId}*\n❌ *reject ${runId}*`;

    const waResult = await WhatsAppService.sendMessage(APPROVER_WA, msg);
    await log("HITLAgent", `Approval requested — ${runId}`, "pending", { approval_id: runId, run_id: runId, wa_result: waResult }, orderId);

    // approval_id returned to UiPath IS the runId; poll + webhook both resolve by
    // runId, cuid, OR orderId — so any of them work.
    return { ok: true, approval_id: runId, run_id: runId, status: "pending", message_sent_to: APPROVER_WA, wa_debug: waResult };
}

async function stepEscrowRelease(orderId: string, approvalId: string) {
    const res = await fetch(`${SITE}/api/escrow/release`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.ZEMA_SERVICE_TOKEN || ""}`,
        },
        body: JSON.stringify({ orderId, releasedBy: "uipath_maestro" }),
    });
    const data = await res.json().catch(() => ({}));
    await log("FinanceAgent", `Escrow release triggered — order ${orderId}`, res.ok ? "completed" : "failed", { approval_id: approvalId, response: data }, orderId);
    return { ok: res.ok, ...data };
}

async function stepNotifySeller(orderId: string) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
            product: { select: { name: true, stock: true } },
            seller: { select: { whatsappNumber: true, businessName: true } },
        },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    const sellerWa = (order.seller as any)?.whatsappNumber;
    if (sellerWa) {
        const msg =
            `⚠️ *FairPrice.ng — Restock Alert*\n\n` +
            `Hi ${order.seller?.businessName ?? "there"},\n` +
            `A buyer tried to order *${order.product?.name}* but it's out of stock.\n\n` +
            `Current stock: *${order.product?.stock ?? 0} units*\n` +
            `Please restock so buyers can complete their orders.\n\n` +
            `Manage inventory: ${SITE}/seller/products`;
        await WhatsAppService.sendMessage(sellerWa, msg);
    }
    await log("CommsAgent", `Seller restock alert sent: ${sellerWa ?? "no WA number"}`, "completed", { product: order.product?.name }, orderId);
    return { ok: true, notified_seller: !!sellerWa, channel: "whatsapp" };
}

async function stepNotifyBuyerOutOfStock(orderId: string) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
            product: { select: { name: true } },
            customer: { select: { whatsappNumber: true, name: true } },
        },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    const buyerWa = (order.customer as any)?.whatsappNumber;
    if (buyerWa) {
        const msg =
            `😔 *FairPrice.ng — Order Unavailable*\n\n` +
            `Hi ${order.customer?.name ?? "there"},\n` +
            `Sorry, *${order.product?.name}* is currently out of stock.\n\n` +
            `We've notified the seller to restock. You'll receive a message when it's available again.\n\n` +
            `Browse alternatives: ${SITE}/search`;
        await WhatsAppService.sendMessage(buyerWa, msg);
    }
    await log("CommsAgent", `Buyer out-of-stock notice sent: ${buyerWa ?? "no WA number"}`, "completed", {}, orderId);
    return { ok: true, notified_buyer: !!buyerWa, channel: "whatsapp" };
}

async function stepNotify(orderId: string) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
            product: { select: { name: true } },
            customer: { select: { whatsappNumber: true, name: true } },
        },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    const buyerWa = (order.customer as any)?.whatsappNumber;
    if (buyerWa) {
        const msg =
            `✅ *FairPrice.ng — Order Confirmed*\n\n` +
            `Hi ${order.customer?.name ?? "there"},\n` +
            `Your order for *${order.product?.name}* has been processed and is on its way.\n\n` +
            `Track: ${SITE}/account/orders\n` +
            `Tracking ID: *${order.trackingId ?? "Pending"}*`;
        await WhatsAppService.sendMessage(buyerWa, msg);
    }
    await log("CommsAgent", `Buyer notified: ${buyerWa ?? "no WA number"}`, "completed", {}, orderId);
    return { ok: true, notified: !!buyerWa, channel: "whatsapp" };
}

// Timeout / cancellation path — called by the BPMN when the approval poll loop
// exhausts (nobody approved in the allotted window). Safe by design: it marks the
// approval `expired` and notifies the buyer, but does NOT move any money — escrow
// stays held for manual review so a slow approver never costs anyone funds.
async function stepHitlTimeout(orderId: string) {
    const pending = await db.zemaApprovalRequest.findFirst({
        where: { orderId, status: "pending" },
        orderBy: { createdAt: "desc" },
    });

    if (pending) {
        await db.zemaApprovalRequest.update({
            where: { id: pending.id },
            data: { status: "expired", resolvedAt: new Date(), approvedBy: "system_timeout" },
        });
    }

    // Let the approver know it lapsed (and stays actionable).
    await WhatsAppService.sendMessage(
        APPROVER_WA,
        `⌛ *ZEMA 360 — Approval Timed Out*\n\n` +
        `Order ${orderId.slice(-8).toUpperCase()} was not approved in time.\n` +
        `Escrow remains *held* — no funds moved. Review it manually:\n${SITE}/admin/orders`
    ).catch(() => {});

    await log("HITLAgent", `Approval timed out — order ${orderId}`, "expired", { approval_id: pending?.runId ?? null }, orderId);
    return { ok: true, status: "expired", approval_id: pending?.runId ?? null, escrow: "held" };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { step: string; orderId: string; agentDecision?: any; approvalId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { step, orderId, agentDecision, approvalId } = body;
    if (!step || !orderId) {
        return NextResponse.json({ error: "step and orderId are required" }, { status: 400 });
    }

    try {
        let result: any;
        switch (step) {
            case "inventory":       result = await stepInventory(orderId); break;
            case "fulfillment":     result = await stepFulfillment(orderId); break;
            case "finance":         result = await stepFinance(orderId); break;
            case "hitl_request":    result = await stepHitlRequest(orderId, agentDecision); break;
            case "hitl_timeout":    result = await stepHitlTimeout(orderId); break;
            case "escrow_release":  result = await stepEscrowRelease(orderId, approvalId ?? ""); break;
            case "notify":                    result = await stepNotify(orderId); break;
            case "notify_seller":             result = await stepNotifySeller(orderId); break;
            case "notify_buyer_out_of_stock": result = await stepNotifyBuyerOutOfStock(orderId); break;
            default:
                return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 });
        }
        return NextResponse.json({ step, orderId, ...result });
    } catch (err: any) {
        console.error(`[zema360/process-order] step=${step}`, err);
        return NextResponse.json({ error: "Internal error", detail: err.message }, { status: 500 });
    }
}
