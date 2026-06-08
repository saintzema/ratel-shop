/* ──────────────────────────────────────────────────────────
   Qwen (Alibaba Cloud Model Studio / DashScope) client
   ──────────────────────────────────────────────────────────
   Single entry point for every Ziva call to Qwen. Uses the
   OpenAI-compatible endpoint so the request/response shape is
   the standard chat-completions contract (messages, tools,
   tool_calls, response_format).

   Regions (DashScope OpenAI-compatible base URLs):
     - Singapore (intl):  https://dashscope-intl.aliyuncs.com/compatible-mode/v1
     - Beijing (china):   https://dashscope.aliyuncs.com/compatible-mode/v1
   Set QWEN_BASE_URL to override; defaults to the international
   (Singapore) endpoint which is what our Function Compute region
   talks to.

   Models:
     - qwen-max     → deep reasoning / negotiation / Ziva chat
     - qwen-plus    → cheap classification / quick JSON tasks
     - qwen-vl-max  → multimodal (product photo → listing, KYC docs)
   ────────────────────────────────────────────────────────── */

const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
const QWEN_BASE_URL = (process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
const CHAT_URL = `${QWEN_BASE_URL}/chat/completions`;

export const QWEN_MODELS = {
    reason: process.env.QWEN_MODEL_REASON || "qwen-max",
    fast: process.env.QWEN_MODEL_FAST || "qwen-plus",
    vision: process.env.QWEN_MODEL_VISION || "qwen-vl-max",
} as const;

export function isQwenConfigured(): boolean {
    return Boolean(QWEN_API_KEY);
}

/* ── OpenAI-compatible message + tool types (only what we use) ── */
export type QwenRole = "system" | "user" | "assistant" | "tool";

export interface QwenMessage {
    role: QwenRole;
    content: string | null | Array<{ type: string;[k: string]: any }>;
    name?: string;
    tool_calls?: QwenToolCall[];
    tool_call_id?: string;
}

export interface QwenToolCall {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
}

export interface QwenTool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: Record<string, any>;
    };
}

export interface QwenChatOptions {
    model?: string;
    messages: QwenMessage[];
    tools?: QwenTool[];
    toolChoice?: "auto" | "none" | "required";
    temperature?: number;
    /** Force a strict JSON object back (response_format json_object). */
    json?: boolean;
    /** Turn on Qwen's built-in web search grounding (replaces Gemini google_search). */
    enableSearch?: boolean;
    /** Total timeout per HTTP attempt, ms. */
    timeoutMs?: number;
    /** Max retry attempts on 429/5xx/network. */
    maxRetries?: number;
}

export interface QwenChatResult {
    content: string | null;
    toolCalls: QwenToolCall[];
    raw: any;
}

/* ──────────────────────────────────────────────────────────
   chat() — one round trip to Qwen.
   Handles retry-with-backoff on rate limits (429) and transient
   5xx/network errors, mirroring the gemini-price retry pattern.
   ────────────────────────────────────────────────────────── */
export async function chat(opts: QwenChatOptions): Promise<QwenChatResult> {
    if (!QWEN_API_KEY) {
        throw new Error("DASHSCOPE_API_KEY (Qwen) is not configured");
    }

    const {
        model = QWEN_MODELS.reason,
        messages,
        tools,
        toolChoice,
        temperature = 0.7,
        json = false,
        enableSearch = false,
        timeoutMs = 45_000,
        maxRetries = 4,
    } = opts;

    const body: Record<string, any> = { model, messages, temperature };
    if (tools && tools.length > 0) {
        body.tools = tools;
        if (toolChoice) body.tool_choice = toolChoice;
    }
    if (json) body.response_format = { type: "json_object" };
    // DashScope-specific: web search grounding. Passed inline; ignored by the
    // compatible layer if unsupported for the chosen model.
    if (enableSearch) body.enable_search = true;

    let lastErr: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${QWEN_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timer);

            // Retry on rate limit / overload
            if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
                const backoff = Math.pow(2, attempt) * 800 + Math.random() * 600;
                await new Promise(r => setTimeout(r, backoff));
                continue;
            }

            if (!res.ok) {
                const text = await res.text().catch(() => res.statusText);
                throw new Error(`Qwen API ${res.status}: ${text.slice(0, 500)}`);
            }

            const data = await res.json();
            const msg = data?.choices?.[0]?.message ?? {};
            return {
                content: typeof msg.content === "string" ? msg.content : null,
                toolCalls: Array.isArray(msg.tool_calls) ? msg.tool_calls : [],
                raw: data,
            };
        } catch (err: any) {
            clearTimeout(timer);
            lastErr = err;
            // AbortError or network blip → backoff and retry
            if (attempt < maxRetries) {
                const backoff = Math.pow(2, attempt) * 800 + Math.random() * 600;
                await new Promise(r => setTimeout(r, backoff));
                continue;
            }
        }
    }

    throw lastErr || new Error("Qwen request failed after retries");
}

/* ──────────────────────────────────────────────────────────
   chatJson() — convenience for the price/seller/reviews routes
   that just need a single JSON object back from a text prompt.
   Returns the parsed object (best-effort JSON extraction).
   ────────────────────────────────────────────────────────── */
export async function chatJson<T = any>(
    prompt: string,
    opts: { model?: string; system?: string; enableSearch?: boolean; temperature?: number } = {}
): Promise<T> {
    const messages: QwenMessage[] = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: prompt });

    const { content } = await chat({
        model: opts.model || QWEN_MODELS.reason,
        messages,
        json: true,
        enableSearch: opts.enableSearch,
        temperature: opts.temperature ?? 0.4,
    });

    return extractJson<T>(content || "");
}

/* Robust JSON extractor — tolerant of ```json fences or stray prose. */
export function extractJson<T = any>(text: string): T {
    let s = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = s.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) s = match[0];
    return JSON.parse(s) as T;
}
