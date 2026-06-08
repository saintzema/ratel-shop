/* ──────────────────────────────────────────────────────────
   Provider-agnostic text generation (Qwen ⇄ Gemini)
   ──────────────────────────────────────────────────────────
   One entry point for the prompt→text routes (price / seller /
   reviews). Defaults to Qwen (qwen-max via Alibaba Cloud Model
   Studio); admin can flip the whole app to Gemini with
   AI_PROVIDER=gemini. Returns RAW text so each route keeps its
   own JSON parsing + post-processing untouched.

   `search: true` maps to Qwen's `enable_search` and to Gemini's
   `google_search` grounding tool — the same "ground this answer
   on the live web" intent across both providers.
   ────────────────────────────────────────────────────────── */
import { chat, isQwenConfigured, QWEN_MODELS } from './qwen';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export function activeProvider(): 'qwen' | 'gemini' {
    return (process.env.AI_PROVIDER || 'qwen').toLowerCase() === 'gemini' ? 'gemini' : 'qwen';
}

/** True if at least one provider is usable (so routes can gate on this instead of GEMINI_API_KEY). */
export function isAIConfigured(): boolean {
    return isQwenConfigured() || Boolean(GEMINI_API_KEY);
}

export interface GenerateOpts {
    search?: boolean;
    temperature?: number;
}

/**
 * Generate text from a single prompt using the active provider, with a
 * graceful fallback to whichever provider IS configured. Throws only if
 * neither provider is available or both fail.
 */
export async function generateText(prompt: string, opts: GenerateOpts = {}): Promise<string> {
    const provider = activeProvider();
    const temperature = opts.temperature ?? 0.7;

    // Honour the explicit Gemini switch first.
    if (provider === 'gemini' && GEMINI_API_KEY) {
        return geminiText(prompt, opts, temperature);
    }

    // Default path: Qwen.
    if (isQwenConfigured()) {
        try {
            const { content } = await chat({
                model: QWEN_MODELS.reason,
                messages: [{ role: 'user', content: prompt }],
                enableSearch: Boolean(opts.search),
                temperature,
            });
            if (content && content.trim()) return content;
        } catch (err) {
            // Fall through to Gemini if it's available.
            if (!GEMINI_API_KEY) throw err;
        }
    }

    if (GEMINI_API_KEY) return geminiText(prompt, opts, temperature);
    throw new Error('No AI provider configured (set DASHSCOPE_API_KEY or GEMINI_API_KEY)');
}

/* ── Gemini implementation with optional grounding + retry/backoff ── */
async function geminiText(prompt: string, opts: GenerateOpts, temperature: number): Promise<string> {
    const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature },
    };
    if (opts.search) body.tools = [{ google_search: {} }];

    const fetchWithRetry = async (attempt = 0): Promise<Response> => {
        const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if ((res.status === 429 || res.status === 503) && attempt < 5) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000 + Math.random() * 1000));
            return fetchWithRetry(attempt + 1);
        }
        return res;
    };

    const res = await fetchWithRetry();
    if (!res.ok) throw new Error(`Gemini API failed with status ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No text returned from Gemini');
    return text;
}
