/**
 * POST /api/zema360/process-order
 *
 * ZEMA 360 Enterprise API — autonomous order processing endpoint.
 *
 * Authenticated merchants (Scale-tier ApiKey) submit an order payload and get back
 * a structured multi-agent run: inventory check, risk scoring, negotiation panel
 * positions, fulfilment decision, and — when risk ≥ 60 — a HITL checkpoint request.
 *
 * Auth: Bearer <api_key>   (API keys issued via /seller/settings on Scale tier)
 *
 * Body:
 *   {
 *     orderId?: string;          // existing FairPrice order ID (optional)
 *     productId: string;
 *     buyerId: string;
 *     sellerId: string;
 *     quantity: number;
 *     proposedPrice?: number;    // buyer's proposed price (NGN); defaults to catalogue price
 *     notes?: string;
 *   }
 *
 * Response:
 *   {
 *     runId: string;
 *     phase: string;
 *     decision: "approve" | "counter" | "reject" | "awaiting_human";
 *     agents: AgentPosition[];
 *     offer: { price: number; terms: string };
 *     requiresHuman: boolean;
 *     approvalRequestId?: string;
 *     log: string[];
 *     durationMs: number;
 *   }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chat, isQwenConfigured, QWEN_MODELS, type QwenMessage } from "@/lib/qwen";
import { WhatsAppService } from "@/lib/whatsapp-service";

export const runtime = "nodejs";

const ZEMA_APPROVER_WHATSAPP = process.env.ZEMA_APPROVER_WHATSAPP ?? "+2348162816305";
const RISK_THRESHOLD = 60;

// ─── API key validation ──────────────────────────────────────────────────────

async function validateApiKey(request: Request): Promise<{
    valid: boolean;
    sellerId?: string;
    error?: string;
}> {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
        return { valid: false, error: "Missing Bearer token" };
    }
    const key = auth.slice(7).trim();
    if (!key) {
        return { valid: false, error: "Empty API key" };
    }

    try {
        const apiKey = await db.apiKey.findUnique({
            where: { key },
            select: {
                id: true,
                sellerId: true,
                expiresAt: true,
                seller: { select: { subscriptionPlan: true } },
            },
        });

        if (!apiKey) return { valid: false, error: "Invalid API key" };
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return { valid: false, error: "API key expired" };
        }
        // Require Scale tier for programmatic API access
        if (apiKey.seller?.subscriptionPlan !== "Scale") {
            return { valid: false, error: "API access requires the Scale subscription plan" };
        }

        return { valid: true, sellerId: apiKey.sellerId };
    } catch {
        // ApiKey model may not exist in older migrations — fall back gracefully
        return { valid: false, error: "API key lookup unavailable" };
    }
}

// ─── Agent panel (inline Qwen calls, mirroring the Python agents) ────────────

interface AgentPosition {
    agent: string;
    stance: "approve" | "counter" | "reject";
    rationale: string;
    proposal: Record<string, unknown>;
    riskScore: number;
}

async function runAgentPanel(deal: Record<string, unknown>): Promise<AgentPosition[]> {
    const agents = [
        {
            name: "sales",
            system:
                "You are FairPrice's Sales agent. Close the deal; propose price and terms that maximise conversion without going below Finance's floor.",
        },
        {
            name: "inventory",
            system:
                "You are FairPrice's Inventory agent. Confirm the seller has stock, lead times are honest, and the quantity can ship. Reject unfulfilable deals.",
        },
        {
            name: "finance",
            system:
                "You are FairPrice's Finance agent. Guard margin and buyer credit risk. Assign a risk_score 0-100 (≥60 requires human approval). Veto unsafe deals.",
        },
    ];

    const dealJson = JSON.stringify(deal, null, 2);
    const results: AgentPosition[] = [];

    for (const agent of agents) {
        try {
            const messages: QwenMessage[] = [
                { role: "system", content: agent.system },
                {
                    role: "user",
                    content:
                        `DEAL:\n${dealJson}\n\n` +
                        `Respond as strict JSON: ` +
                        `{"stance":"approve|counter|reject","rationale":"...","proposal":{},"risk_score":0}`,
                },
            ];
            const { content } = await chat({
                model: QWEN_MODELS.fast,
                messages,
                temperature: 0.3,
            });

            let parsed: any = {};
            try {
                const raw = content ?? "";
                const clean = raw.replace(/```json\s?/g, "").replace(/```/g, "").trim();
                parsed = JSON.parse(clean);
            } catch {
                parsed = { stance: "counter", rationale: (content ?? "").slice(0, 200), risk_score: 50 };
            }

            results.push({
                agent: agent.name,
                stance: parsed.stance ?? "counter",
                rationale: parsed.rationale ?? "",
                proposal: parsed.proposal ?? {},
                riskScore: Number(parsed.risk_score ?? 50),
            });
        } catch {
            results.push({
                agent: agent.name,
                stance: "counter",
                rationale: "Agent unavailable — defaulting to manual review",
                proposal: {},
                riskScore: 70,
            });
        }
    }
    return results;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const t0 = Date.now();
    const log: string[] = [];

    const auth = await validateApiKey(request);
    if (!auth.valid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (!isQwenConfigured()) {
        return NextResponse.json(
            { error: "Qwen not configured — set DASHSCOPE_API_KEY" },
            { status: 503 }
        );
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { productId, buyerId, sellerId, quantity = 1, proposedPrice, notes, orderId } = body;
    if (!productId || !buyerId || !sellerId) {
        return NextResponse.json(
            { error: "productId, buyerId, and sellerId are required" },
            { status: 400 }
        );
    }

    const runId = `zema-run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Structured log for Vercel Functions observability
    console.log(JSON.stringify({
        event: "zema360.run.start",
        runId,
        sellerId: auth.sellerId,
        productId,
        buyerId,
        quantity,
        ts: new Date().toISOString(),
    }));
    log.push(`[${new Date().toISOString()}] ZEMA 360 run started: ${runId}`);

    // ── Phase 1: Inventory check ──────────────────────────────────────────────
    log.push("Phase: ASSESS — checking inventory and pricing");
    let catalogue: any = null;
    try {
        catalogue = await db.product.findUnique({
            where: { id: productId },
            select: { id: true, name: true, price: true, stock: true, isActive: true, sellerId: true },
        });
    } catch { /* DB may not have this product */ }

    const cataloguePrice = catalogue?.price ?? proposedPrice ?? 0;
    const effectivePrice = proposedPrice ?? cataloguePrice;
    const stockOk = (catalogue?.stock ?? 999) >= quantity;

    const deal = {
        runId,
        orderId: orderId ?? null,
        productId,
        productName: catalogue?.name ?? productId,
        buyerId,
        sellerId,
        quantity,
        cataloguePrice,
        proposedPrice: effectivePrice,
        stockAvailable: catalogue?.stock ?? "unknown",
        notes: notes ?? "",
        timestamp: new Date().toISOString(),
    };

    log.push(
        `Catalogue price: ₦${cataloguePrice.toLocaleString()} | ` +
        `Proposed: ₦${effectivePrice.toLocaleString()} | ` +
        `Stock: ${stockOk ? "✓" : "⚠ low"}`
    );

    // ── Phase 2: Multi-agent negotiation panel ────────────────────────────────
    log.push("Phase: NEGOTIATE — running Sales / Inventory / Finance panel");
    const positions = await runAgentPanel(deal);

    const financePosition = positions.find(p => p.agent === "finance");
    const maxRisk = Math.max(...positions.map(p => p.riskScore));
    const hasVeto = positions.some(p => p.stance === "reject");
    const requiresHuman = hasVeto || maxRisk >= RISK_THRESHOLD;

    log.push(
        `Agent panel: ${positions.map(p => `${p.agent}=${p.stance}(risk=${p.riskScore})`).join(", ")}`
    );
    log.push(`Risk score: ${maxRisk} | Veto: ${hasVeto} | Requires human: ${requiresHuman}`);

    // ── Phase 3: Derive consensus offer ──────────────────────────────────────
    const counterPrices = positions
        .filter(p => p.stance !== "reject" && typeof p.proposal?.price === "number")
        .map(p => p.proposal.price as number);
    const offerPrice =
        counterPrices.length > 0
            ? Math.round(counterPrices.reduce((a, b) => a + b, 0) / counterPrices.length)
            : effectivePrice;

    const offer = {
        price: offerPrice,
        currency: "NGN",
        terms: financePosition?.proposal?.terms ?? "Standard 30-day escrow",
    };

    // ── Phase 4: HITL checkpoint (when required) ──────────────────────────────
    let approvalRequestId: string | undefined;
    if (requiresHuman) {
        log.push("Phase: AWAITING_APPROVAL — escalating to human approver");
        approvalRequestId = `${runId}-approval`;

        // Persist to DB so the inbound WhatsApp webhook can resolve it
        try {
            await db.zemaApprovalRequest.create({
                data: {
                    id: approvalRequestId,
                    runId,
                    sellerId: sellerId ?? null,
                    buyerId: buyerId ?? null,
                    productId: productId ?? null,
                    orderId: orderId ?? null,
                    agentDecision: JSON.stringify({ positions, offer }),
                    status: "pending",
                },
            });
        } catch (dbErr: any) {
            log.push(`Warning: could not persist approval request: ${dbErr?.message}`);
        }

        const approvalMsg =
            `🔔 ZEMA 360 Approval Required\n\n` +
            `Run: ${runId}\n` +
            `Product: ${catalogue?.name ?? productId}\n` +
            `Proposed: ₦${effectivePrice.toLocaleString()}\n` +
            `Panel Offer: ₦${offerPrice.toLocaleString()}\n` +
            `Risk Score: ${maxRisk}/100\n` +
            `Reason: ${hasVeto ? "Agent veto" : "High risk score"}\n\n` +
            `Buyer: ${buyerId} | Seller: ${sellerId}`;

        try {
            await WhatsAppService.sendMessage(
                ZEMA_APPROVER_WHATSAPP,
                `${approvalMsg}\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `Reply with:\n` +
                `✅  approve ${approvalRequestId}\n` +
                `❌  reject ${approvalRequestId}\n` +
                `━━━━━━━━━━━━━━━━━━`
            );
            log.push(`HITL request sent to ${ZEMA_APPROVER_WHATSAPP} (id: ${approvalRequestId})`);
        } catch (err: any) {
            log.push(`HITL WhatsApp failed: ${err?.message ?? String(err)}`);
        }
    }

    // ── Final decision ────────────────────────────────────────────────────────
    const decision: string = requiresHuman
        ? "awaiting_human"
        : hasVeto
        ? "reject"
        : positions.every(p => p.stance === "approve")
        ? "approve"
        : "counter";

    log.push(`Phase: ${requiresHuman ? "AWAITING_APPROVAL" : "DONE"} — decision: ${decision}`);

    const durationMs = Date.now() - t0;
    console.log(JSON.stringify({
        event: "zema360.run.complete",
        runId,
        decision,
        requiresHuman,
        maxRisk,
        agentStances: positions.map(p => ({ agent: p.agent, stance: p.stance, risk: p.riskScore })),
        offerPrice,
        durationMs,
        ts: new Date().toISOString(),
    }));

    return NextResponse.json({
        runId,
        phase: requiresHuman ? "awaiting_approval" : "done",
        decision,
        agents: positions,
        offer,
        requiresHuman,
        approvalRequestId: approvalRequestId ?? null,
        log,
        durationMs,
    });
}
