import { NextRequest, NextResponse } from "next/server";
import { isDynamoConfigured, ensureTable, writeAgentLog, readAllAgentLogs, AgentLogEntry } from "@/lib/dynamodb";

export const dynamic = "force-dynamic";

// ── GET — paginated agent-log events (?page=1&pageSize=30) ─────────────────
// Previously hardcapped at "last 30" with no way to page further back —
// anything older simply vanished from the live dashboard with no path to it.
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "30", 10) || 30));

    // 1. Try DynamoDB (primary — AWS integration for H0 hackathon)
    if (isDynamoConfigured()) {
        try {
            await ensureTable();
            const all = await readAllAgentLogs();
            const total = all.length;
            const start = (page - 1) * pageSize;
            const raw = all.slice(start, start + pageSize);
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
            return NextResponse.json({
                events, configured: true, provider: "dynamodb",
                page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)),
            });
        } catch (err) {
            console.error("[zema360/events] DynamoDB read failed:", err);
        }
    }

    // 2. Fallback: Firebase RTDB (keeps dashboard working before AWS keys are set)
    const DB_URL = process.env.FIREBASE_DATABASE_URL?.replace(/\/$/, "");
    const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET;

    if (!DB_URL) {
        return NextResponse.json({ events: [], configured: false, page, pageSize, total: 0, totalPages: 1 });
    }

    try {
        const url = `${DB_URL}/zema360/events.json?auth=${DB_SECRET}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return NextResponse.json({ events: [], configured: true, provider: "firebase", error: `Firebase ${res.status}: ${errText.slice(0, 120)}`, page, pageSize, total: 0, totalPages: 1 });
        }

        const raw = await res.json();
        if (!raw) return NextResponse.json({ events: [], configured: true, provider: "firebase", page, pageSize, total: 0, totalPages: 1 });

        const sorted = Object.entries(raw)
            .map(([id, val]) => ({ id, ...(val as object) }))
            .sort((a: any, b: any) => b.ts - a.ts);
        const total = sorted.length;
        const start = (page - 1) * pageSize;
        const events = sorted.slice(start, start + pageSize);

        return NextResponse.json({ events, configured: true, provider: "firebase", page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
    } catch {
        return NextResponse.json({ events: [], configured: false, error: "Network error", page, pageSize, total: 0, totalPages: 1 });
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
