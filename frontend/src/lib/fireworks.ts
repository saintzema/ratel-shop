/**
 * Fireworks AI provider — runs inference on AMD-hosted GPUs (AMD Developer Hackathon).
 *
 * OpenAI-compatible chat-completions endpoint. Used as the PRIMARY provider for FairPrice's
 * AI flows (product listing generation, price intelligence, Ziva assistant) when
 * FIREWORKS_API_KEY is configured, with Gemini/Qwen kept as automatic fallbacks so nothing
 * breaks if Fireworks is unavailable.
 *
 * Llama 3.1 70B/8B, Gemma 3 27B, Gemma 2 9B, Llama 4 Maverick, and DeepSeek V3.1 all
 * returned "Model not found, inaccessible, and/or not deployed" on this account — not an
 * account-wide block after all, just those specific models weren't in this account's
 * enabled serverless set. GLM 5.2 (confirmed working in both the Fireworks Playground and
 * a direct curl call) is, so that's the default now.
 *
 * Configure in Vercel:
 *   FIREWORKS_API_KEY   — from the AMD AI Developer Program / Fireworks dashboard
 *   FIREWORKS_MODEL     — optional; defaults to GLM 5.2
 */

const FIREWORKS_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const FIREWORKS_MODEL = process.env.FIREWORKS_MODEL || "accounts/fireworks/models/glm-5p2";

/** True when a Fireworks key is present, so callers can prefer AMD inference. */
export function isFireworksEnabled(): boolean {
    return !!process.env.FIREWORKS_API_KEY;
}

export function fireworksModel(): string {
    return FIREWORKS_MODEL;
}

export interface FireworksChatOpts {
    system?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    /** Ask the model to return a single JSON object (used by listing/price generators). */
    jsonMode?: boolean;
    timeoutMs?: number;
}

/**
 * Single-turn chat completion against Fireworks. Returns the assistant message string, or
 * null on any failure (missing key, network, non-200) so callers can fall back cleanly.
 */
export async function fireworksChat(opts: FireworksChatOpts): Promise<string | null> {
    const key = process.env.FIREWORKS_API_KEY;
    if (!key) return null;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
    try {
        const messages: { role: string; content: string }[] = [];
        if (opts.system) messages.push({ role: "system", content: opts.system });
        messages.push({ role: "user", content: opts.prompt });

        const body: Record<string, any> = {
            model: FIREWORKS_MODEL,
            messages,
            temperature: opts.temperature ?? 0.7,
            max_tokens: opts.maxTokens ?? 2048,
        };
        if (opts.jsonMode) body.response_format = { type: "json_object" };

        const res = await fetch(FIREWORKS_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            console.error(`[fireworks] ${res.status}: ${detail.slice(0, 300)}`);
            return null;
        }
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        return typeof content === "string" && content.trim() ? content : null;
    } catch (err: any) {
        if (err?.name !== "AbortError") console.error("[fireworks] error:", err?.message ?? err);
        return null;
    } finally {
        clearTimeout(t);
    }
}

/**
 * Convenience: get parsed JSON from Fireworks (strips ```json fences). Returns null on any
 * failure or parse error.
 */
export async function fireworksJSON<T = any>(opts: FireworksChatOpts): Promise<T | null> {
    const raw = await fireworksChat({ ...opts, jsonMode: true });
    if (!raw) return null;
    try {
        const clean = raw.replace(/```json\s?/gi, "").replace(/```/g, "").trim();
        return JSON.parse(clean) as T;
    } catch {
        return null;
    }
}
