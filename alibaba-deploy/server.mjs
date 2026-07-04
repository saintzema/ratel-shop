import http from "node:http";

/**
 * ZEMA 360 — Qwen Cloud Proof-of-Deployment Service
 *
 * Minimal standalone mirror of the same Qwen Cloud call FairPrice's
 * production app makes from /api/gemini-price (qwen-plus, DashScope
 * OpenAI-compatible endpoint). This exists purely so something real,
 * calling Qwen Cloud, is actually running on Alibaba Cloud compute —
 * required for the Global AI Hackathon Series proof-of-deployment.
 *
 * Endpoints:
 *   GET  /health            -> liveness check
 *   POST /agent/price-check -> { productName } -> Qwen Cloud market-price lookup
 */

const PORT = process.env.PORT || 8080;
const QWEN_BASE = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY;

async function callQwen(productName) {
    if (!QWEN_API_KEY) {
        throw new Error("DASHSCOPE_API_KEY is not set");
    }
    const res = await fetch(`${QWEN_BASE}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${QWEN_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "qwen-plus",
            messages: [
                {
                    role: "user",
                    content: `You are ZEMA 360, an autonomous commerce agent for FairPrice, a Nigerian marketplace. Give a brief, realistic Nigerian market price estimate (in NGN) for: "${productName}". Reply in 1-2 sentences.`,
                },
            ],
        }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Qwen Cloud error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "zema360-qwen-proof", qwenConfigured: !!QWEN_API_KEY }));
        return;
    }

    if (req.method === "POST" && req.url === "/agent/price-check") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            try {
                const { productName } = JSON.parse(body || "{}");
                if (!productName) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "productName is required" }));
                    return;
                }
                const result = await callQwen(productName);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ productName, priceEstimate: result, model: "qwen-plus", provider: "Qwen Cloud (DashScope)" }));
            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Try GET /health or POST /agent/price-check" }));
});

server.listen(PORT, () => {
    console.log(`[zema360-qwen-proof] listening on :${PORT}`);
});
