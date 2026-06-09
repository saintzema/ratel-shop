/**
 * POST /api/zema360/ingest
 *
 * Multimodal listing ingest — delegates to the Qwen-VL (qwen-vl-max) pipeline
 * running on Alibaba Cloud Function Compute.
 *
 * Auth: Bearer ZEMA_SERVICE_TOKEN  (internal agent calls) OR
 *       Bearer ApiKey              (Scale-tier enterprise customers)
 *
 * Request body:
 * {
 *   seller_id  : string       // FairPrice seller ID
 *   image_urls : string[]     // product photo URLs (public or pre-signed OSS, max 10)
 *   kyc_urls   : string[]     // KYC document URLs (max 3)
 *   seller_name?: string      // optional — used for KYC name-match check
 * }
 *
 * Response (on success):
 * {
 *   run_id         : string
 *   title          : string
 *   category       : string
 *   price_ngn      : number | null
 *   condition      : "new" | "fairly_used" | "used"
 *   quantity       : number
 *   description    : string
 *   tags           : string[]
 *   confidence     : number
 *   kyc_verified   : boolean
 *   image_oss_paths: string[]
 *   kyc_oss_paths  : string[]
 *   durationMs     : number
 * }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireZemaAuth } from "@/lib/zema-auth";

export const runtime = "nodejs";
export const maxDuration = 120;   // Qwen-VL may take 30-60s per image

const FC_BASE_URL = process.env.ZEMA_FC_URL || "http://localhost:8000";

export async function POST(request: Request) {
    const t0 = Date.now();

    // ── Auth: accept ZEMA_SERVICE_TOKEN or a Scale-tier ApiKey ──────────────
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    let sellerId: string | null = null;
    let authOk = false;

    // 1. Service token (internal / agent layer)
    const serviceToken = process.env.ZEMA_SERVICE_TOKEN || "";
    const cronSecret   = process.env.CRON_SECRET || "";
    if (serviceToken && token === serviceToken) {
        authOk = true;
    } else if (cronSecret && token === cronSecret) {
        authOk = true;
    }

    // 2. Scale-tier ApiKey (enterprise customers)
    if (!authOk && token) {
        try {
            const apiKey = await db.apiKey.findUnique({ where: { key: token } });
            if (apiKey) {
                const seller = await db.seller.findUnique({
                    where: { id: apiKey.sellerId },
                    select: { id: true, subscriptionPlan: true },
                });
                if (seller?.subscriptionPlan === "Scale") {
                    authOk = true;
                    sellerId = seller.id;
                    // touch lastUsedAt
                    await db.apiKey.update({
                        where: { id: apiKey.id },
                        data: { lastUsedAt: new Date() },
                    }).catch(() => {});
                }
            }
        } catch {
            // DB error → fall through to 401
        }
    }

    if (!authOk) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    let body: {
        seller_id?: string;
        image_urls?: string[];
        kyc_urls?: string[];
        seller_name?: string;
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const effectiveSellerId = body.seller_id || sellerId;
    if (!effectiveSellerId) {
        return NextResponse.json({ error: "seller_id is required" }, { status: 400 });
    }
    if (!body.image_urls?.length) {
        return NextResponse.json({ error: "image_urls is required (at least 1)" }, { status: 400 });
    }

    // ── Delegate to FC backend ────────────────────────────────────────────────
    const fcPayload = {
        seller_id:   effectiveSellerId,
        image_urls:  (body.image_urls || []).slice(0, 10),
        kyc_urls:    (body.kyc_urls   || []).slice(0, 3),
        seller_name: body.seller_name || "",
    };

    console.log(JSON.stringify({
        event:     "zema360.ingest.start",
        seller_id: effectiveSellerId,
        n_images:  fcPayload.image_urls.length,
        n_kyc:     fcPayload.kyc_urls.length,
        ts:        new Date().toISOString(),
    }));

    try {
        const fcRes = await fetch(`${FC_BASE_URL}/api/v1/zema/ingest`, {
            method:  "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${serviceToken}`,
            },
            body: JSON.stringify(fcPayload),
            signal: AbortSignal.timeout(115_000),
        });

        if (!fcRes.ok) {
            const errText = await fcRes.text().catch(() => "");
            console.error("[zema360/ingest] FC error", fcRes.status, errText.slice(0, 200));
            return NextResponse.json(
                { error: `Ingest backend error: ${fcRes.status}` },
                { status: 502 }
            );
        }

        const result = await fcRes.json();
        const durationMs = Date.now() - t0;

        console.log(JSON.stringify({
            event:       "zema360.ingest.complete",
            seller_id:   effectiveSellerId,
            run_id:      result.listing?.run_id ?? result.run_id,
            kyc_verified: result.listing?.kyc_verified ?? false,
            durationMs,
            ts:          new Date().toISOString(),
        }));

        return NextResponse.json({ ...result, durationMs });
    } catch (err: any) {
        const durationMs = Date.now() - t0;
        console.error("[zema360/ingest] fetch error:", err?.message);
        return NextResponse.json(
            { error: err?.message ?? "Ingest failed", durationMs },
            { status: 500 }
        );
    }
}
