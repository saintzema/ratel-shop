// Plate-number OCR — Google Cloud Vision TEXT_DETECTION, called server-side
// only (a Vision key must NOT be exposed to the browser the way the
// referrer-restricted Maps key is; Vision has no equivalent referrer
// restriction, so a leaked key here is directly billable by anyone).
// Gated exactly like Maps/Twilio: hasVisionConfig is false until a real key
// is set, and every caller must treat OCR as an auto-fill SUGGESTION the
// human still confirms — never a substitute for the actual admin vehicle
// inspection that already gates a driver going live.
const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

export const hasVisionConfig = !!VISION_API_KEY;

// Nigerian plates are typically 3 letters + 3 digits + 1-2 letters
// (e.g. "ABC123DE"), sometimes with dashes/spaces. This just scores
// candidate tokens from the raw OCR text — it does not validate against
// any government plate registry (no such API exists for us to call).
const PLATE_PATTERN = /^[A-Z]{2,3}[\s-]?\d{2,4}[\s-]?[A-Z]{0,3}$/;

function bestPlateGuess(rawText: string): string | null {
    const candidates = rawText
        .split(/\n|\s{2,}/)
        .map(line => line.replace(/[^A-Z0-9\s-]/gi, "").trim().toUpperCase())
        .filter(Boolean);

    for (const c of candidates) {
        const compact = c.replace(/[\s-]/g, "");
        if (PLATE_PATTERN.test(c) || (compact.length >= 6 && compact.length <= 9 && /[A-Z]/.test(compact) && /\d/.test(compact))) {
            return compact;
        }
    }
    return null;
}

export async function recognizePlate(imageBase64: string): Promise<{ guess: string | null; rawText: string | null; error?: string }> {
    if (!hasVisionConfig) return { guess: null, rawText: null, error: "Vision API not configured" };

    try {
        const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requests: [{ image: { content: imageBase64 }, features: [{ type: "TEXT_DETECTION" }] }],
            }),
        });
        const data = await res.json();
        const rawText: string | null = data?.responses?.[0]?.fullTextAnnotation?.text || data?.responses?.[0]?.textAnnotations?.[0]?.description || null;
        if (!rawText) return { guess: null, rawText: null, error: "No text detected in the photo" };

        return { guess: bestPlateGuess(rawText), rawText };
    } catch (err: any) {
        return { guess: null, rawText: null, error: err.message };
    }
}
