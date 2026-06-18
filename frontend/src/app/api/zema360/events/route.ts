import { NextRequest, NextResponse } from "next/server";
import { isDynamoConfigured, ensureTable, writeAgentLog, readAgentLogs, AgentLogEntry } from "@/lib/dynamodb";

export const dynamic = "force-dynamic";

// ── GET — read last 30 agent-log events ────────────────────────────────────
export async function GET() {
    // 1. Try DynamoDB (primary — AWS integration for H0 hackathon)
    if (isDynamoConfigured()) {
        try {
            await ensureTable();
            const raw = await readAgentLogs(30);
            // Normalise: items written by logZemaEvent already have ZemaEvent fields (type, description…).
            // Items written by the orchestrator POST use AgentLogEntry fields — map them so the
            // dashboard renders both shapes correctly.
            const events = raw.map((item: any) => ({
                id: item.id,
                type: item.type ?? item.event ?? "agent_decision",
                description: item.description ?? item.event ?? "",
                product: item.product ?? item.payload?.productId ?? undefined,
                model: item.model ?? item.payload?.model ?? undefined,
                mode: item.mode ?? item.payload?.mode ?? undefined,
                count: item.count ?? undefined,
                value: item.value ?? item.payload?.value ?? undefined,
                ts: item.ts,
            }));
            return NextResponse.json({ events, configured: true, provider: "dynamodb" });
        } catch (err) {
            console.error("[zema360/events] DynamoDB read failed:", err);
        }
    }

    // 2. Fallback: Firebase RTDB (keeps dashboard working before AWS keys are set)
    const DB_URL = process.env.FIREBASE_DATABASE_URL?.replace(/\/$/, "");
    const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET;

    if (!DB_URL) {
        return NextResponse.json({ events: [], configured: false });
    }

    try {
        const url = `${DB_URL}/zema360/events.json?auth=${DB_SECRET}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return NextResponse.json({ events: [], configured: true, provider: "firebase", error: `Firebase ${res.status}: ${errText.slice(0, 120)}` });
        }

        const raw = await res.json();
        if (!raw) return NextResponse.json({ events: [], configured: true, provider: "firebase" });

        const events = Object.entries(raw)
            .map(([id, val]) => ({ id, ...(val as object) }))
            .sort((a: any, b: any) => b.ts - a.ts)
            .slice(0, 30);

        return NextResponse.json({ events, configured: true, provider: "firebase" });
    } catch {
        return NextResponse.json({ events: [], configured: false, error: "Network error" });
    }
}

// ── POST — write a new agent-log event (called by ZEMA360 orchestrator) ────
export async function POST(req: NextRequest) {
    // Service-token guard — only the ZEMA orchestrator may write logs
    const auth = req.headers.get("authorization");
    const token = process.env.ZEMA_SERVICE_TOKEN;
    if (token && auth !== `Bearer ${token}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Partial<AgentLogEntry>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.agent || !body.event) {
        return NextResponse.json({ error: "agent and event are required" }, { status: 400 });
    }

    const entry: AgentLogEntry = {
        id: body.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        agent: body.agent,
        event: body.event,
        status: body.status ?? "pending",
        payload: body.payload,
        result: body.result,
        ts: body.ts ?? Date.now(),
        sellerId: body.sellerId,
        orderId: body.orderId,
    };

    if (isDynamoConfigured()) {
        try {
            await ensureTable();
            await writeAgentLog(entry);
            return NextResponse.json({ ok: true, id: entry.id, provider: "dynamodb" });
        } catch (err) {
            console.error("[zema360/events] DynamoDB write failed:", err);
            return NextResponse.json({ error: "Failed to write log" }, { status: 500 });
        }
    }

    // DynamoDB not configured yet — return 202 so orchestrator doesn't crash
    return NextResponse.json({ ok: true, id: entry.id, provider: "none", warning: "AWS not configured — log not persisted" }, { status: 202 });
}
