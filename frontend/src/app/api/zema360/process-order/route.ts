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
    const trackingId = `FP${Date.now().toString(36).toUpperCase()}`;
    const carriers = ["GIG Logistics", "DHL Nigeria", "Jumia Logistics", "RedStar Express"];
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];

    await db.order.update({
        where: { id: orderId },
        data: {
            trackingId,
            carrier,
            trackingStatus: "in_transit" as any,
            trackingSteps: [
                { status: "Order confirmed", ts: new Date().toISOString() },
                { status: "Picked up by carrier", ts: new Date().toISOString() },
            ],
        },
    });
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

async function stepHitlRequest(orderId: string, agentDecision: any) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        include: { product: { select: { name: true } }, seller: { select: { businessName: true } } },
    });
    if (!order) return { ok: false, error: "order_not_found" };

    const runId = `RUN-${Date.now().toString(36).toUpperCase()}`;
    const approval = await db.zemaApprovalRequest.create({
        data: {
            runId,
            orderId,
            status: "pending",
            agentDecision: JSON.stringify(agentDecision ?? {}),
        },
    });

    const msg =
        `🤖 *ZEMA 360 — Human Approval Required*\n\n` +
        `Order: *${order.id.slice(-8).toUpperCase()}*\n` +
        `Product: ${order.product?.name ?? "—"}\n` +
        `Seller: ${order.seller?.businessName ?? "—"}\n` +
        `Amount: *₦${Number(order.amount).toLocaleString()}*\n` +
        `Escrow: held ✅\n\n` +
        `Reply:\n✅ *approve ${approval.id}*\n❌ *reject ${approval.id}*`;

    const waResult = await WhatsAppService.sendMessage(APPROVER_WA, msg);
    await log("HITLAgent", `Approval requested — ${approval.id}`, "pending", { approval_id: approval.id, run_id: runId, wa_result: waResult }, orderId);

    return { ok: true, approval_id: approval.id, run_id: runId, status: "pending", message_sent_to: APPROVER_WA, wa_debug: waResult };
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
