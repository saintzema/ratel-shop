import { db } from "@/lib/db";
import { fireworksChat, isFireworksEnabled } from "@/lib/fireworks";

/**
 * One switchable text-AI layer for every text/JSON feature (captions, quotes, listing copy, price
 * intel, Instagram replies…). The admin picks the PRIMARY provider in Admin → Settings → AI Brain
 * (SystemSetting.aiProvider); the others follow as automatic fallbacks, so a bad key or quota
 * problem on one never takes a feature down. Vision / grounded-search features that only Gemini
 * can do keep calling Gemini directly and are deliberately NOT routed through here.
 */
export type AiProvider = "qwen" | "gemini" | "fireworks";

const DASHSCOPE_BASE = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
// Cheap, fast tier by default — override with QWEN_TEXT_MODEL. (QWEN_MODEL is Ziva's own, pricier model.)
const QWEN_TEXT_MODEL = process.env.QWEN_TEXT_MODEL || "qwen-plus";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

let cached: { value: AiProvider; at: number } | null = null;
export async function getPrimaryProvider(): Promise<AiProvider> {
    if (cached && Date.now() - cached.at < 60_000) return cached.value;
    let value: AiProvider = "qwen";
    try {
        const s = await db.systemSetting.findUnique({ where: { id: "global" }, select: { aiProvider: true } });
        const v = (s?.aiProvider || process.env.AI_PROVIDER || "qwen").toLowerCase();
        if (v === "gemini" || v === "fireworks" || v === "qwen") value = v;
    } catch { /* DB hiccup — keep the default */ }
    cached = { value, at: Date.now() };
    return value;
}
export function clearAiProviderCache() { cached = null; }

export interface AiOpts {
    system?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
    timeoutMs?: number;
}
export interface AiResult { text: string; provider: AiProvider }

async function viaQwen(o: AiOpts): Promise<string | null> {
    const key = process.env.DASHSCOPE_API_KEY;
    if (!key) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 30_000);
    try {
        const messages: any[] = [];
        if (o.system) messages.push({ role: "system", content: o.system });
        // DashScope's JSON mode requires the word "JSON" to appear in the messages.
        messages.push({ role: "user", content: o.json && !/json/i.test(o.prompt + (o.system || "")) ? `${o.prompt}\n\nReturn JSON.` : o.prompt });
        const res = await fetch(`${DASHSCOPE_BASE}/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: QWEN_TEXT_MODEL,
                messages,
                temperature: o.temperature ?? 0.7,
                max_tokens: o.maxTokens ?? 2048,
                enable_thinking: false,
                ...(o.json ? { response_format: { type: "json_object" } } : {}),
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) { console.error(`[ai/qwen] ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`); return null; }
        const d = await res.json();
        const c = d?.choices?.[0]?.message?.content;
        return typeof c === "string" && c.trim() ? c : null;
    } catch (e: any) {
        if (e?.name !== "AbortError") console.error("[ai/qwen]", e?.message ?? e);
        return null;
    } finally { clearTimeout(t); }
}

async function viaFireworks(o: AiOpts): Promise<string | null> {
    if (!isFireworksEnabled()) return null;
    return fireworksChat({ system: o.system, prompt: o.prompt, temperature: o.temperature, maxTokens: o.maxTokens, jsonMode: o.json, timeoutMs: o.timeoutMs });
}

async function viaGemini(o: AiOpts): Promise<string | null> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    try {
        const res = await fetch(`${GEMINI_URL}?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...(o.system ? { systemInstruction: { parts: [{ text: o.system }] } } : {}),
                contents: [{ parts: [{ text: o.prompt }] }],
                generationConfig: { temperature: o.temperature ?? 0.7, ...(o.json ? { responseMimeType: "application/json" } : {}) , ...(o.maxTokens ? { maxOutputTokens: o.maxTokens } : {}) },
            }),
        });
        if (!res.ok) { console.error(`[ai/gemini] ${res.status}`); return null; }
        const d = await res.json();
        const c = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        return typeof c === "string" && c.trim() ? c : null;
    } catch (e: any) { console.error("[ai/gemini]", e?.message ?? e); return null; }
}

const RUNNERS: Record<AiProvider, (o: AiOpts) => Promise<string | null>> = { qwen: viaQwen, fireworks: viaFireworks, gemini: viaGemini };

/** Runs the request against the admin-selected provider first, then the others in order. */
export async function aiText(o: AiOpts): Promise<AiResult | null> {
    const primary = await getPrimaryProvider();
    const order: AiProvider[] = [primary, ...(["qwen", "fireworks", "gemini"] as AiProvider[]).filter(p => p !== primary)];
    for (const p of order) {
        const text = await RUNNERS[p](o);
        if (text) return { text, provider: p };
    }
    return null;
}

export async function aiJSON<T = any>(o: Omit<AiOpts, "json">): Promise<{ data: T; provider: AiProvider } | null> {
    const primary = await getPrimaryProvider();
    const order: AiProvider[] = [primary, ...(["qwen", "fireworks", "gemini"] as AiProvider[]).filter(p => p !== primary)];
    for (const p of order) {
        const text = await RUNNERS[p]({ ...o, json: true });
        if (!text) continue;
        try {
            const clean = text.replace(/```json\s?/gi, "").replace(/```/g, "").trim();
            return { data: JSON.parse(clean) as T, provider: p };
        } catch { /* malformed JSON — try the next provider */ }
    }
    return null;
}
