/**
 * Pre-flight validation for images being pushed to social platforms.
 *
 * Without this, an image that Instagram won't accept fails deep inside the
 * Graph API and the seller sees a raw platform error like "The aspect ratio is
 * not supported" with no idea which of their photos caused it or what to do.
 * Checking first means we can say something actionable before anything is
 * published — and before a scheduled post silently fails at 6am.
 */

export interface MediaCheckResult {
    ok: boolean;
    /** Seller-facing, actionable. Not a raw platform error. */
    error?: string;
    width?: number;
    height?: number;
    contentType?: string;
    bytes?: number;
}

// Instagram's documented feed limits.
const IG_MIN_ASPECT = 4 / 5;      // 0.8 — taller than this is cropped/rejected
const IG_MAX_ASPECT = 1.91;       // wider than this is rejected
const IG_MIN_WIDTH = 320;
const IG_MAX_BYTES = 8 * 1024 * 1024;

const FB_MIN_WIDTH = 200;
const FB_MAX_BYTES = 10 * 1024 * 1024;

const SUPPORTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Reads just enough of the remote image to know its real type/size/dimensions. */
async function probe(url: string): Promise<{ contentType: string; bytes: number; buffer: Buffer } | null> {
    try {
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        return {
            contentType: (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase(),
            bytes: buffer.byteLength,
            buffer,
        };
    } catch {
        return null;
    }
}

/**
 * Validate an image URL for a target platform.
 *
 * The URL must be publicly reachable — Instagram fetches it server-side from
 * Meta's own infrastructure, so a localhost/private/authenticated URL fails
 * there even though it loads fine in the seller's browser. Fetching it here
 * from our server is a reasonable proxy for that reachability.
 */
export async function validateMediaForPlatform(
    url: string,
    platform: "instagram" | "facebook"
): Promise<MediaCheckResult> {
    if (!url || !/^https?:\/\//i.test(url)) {
        return { ok: false, error: "This product needs a real uploaded photo before it can be posted." };
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(url)) {
        return { ok: false, error: "That image is only reachable on your own network — social platforms can't fetch it." };
    }

    const probed = await probe(url);
    if (!probed) {
        return { ok: false, error: "We couldn't load that image. Re-upload the product photo and try again." };
    }

    const { contentType, bytes, buffer } = probed;

    if (contentType && !SUPPORTED.includes(contentType)) {
        return {
            ok: false,
            error: `${contentType.replace("image/", "").toUpperCase() || "That file type"} isn't supported — use a JPG or PNG photo.`,
            contentType,
            bytes,
        };
    }

    const maxBytes = platform === "instagram" ? IG_MAX_BYTES : FB_MAX_BYTES;
    if (bytes > maxBytes) {
        return {
            ok: false,
            error: `That photo is ${(bytes / 1024 / 1024).toFixed(1)}MB — ${platform === "instagram" ? "Instagram" : "Facebook"} needs it under ${maxBytes / 1024 / 1024}MB. Try a smaller image.`,
            contentType,
            bytes,
        };
    }

    // Dimensions via sharp. Imported lazily so this module stays usable in any
    // runtime that doesn't have the native binary available.
    let width: number | undefined;
    let height: number | undefined;
    try {
        const sharp = (await import("sharp")).default;
        const meta = await sharp(buffer, { failOn: "none" }).metadata();
        width = meta.width;
        height = meta.height;
    } catch {
        // Couldn't measure it — don't block the publish on our own tooling failing.
        return { ok: true, contentType, bytes };
    }

    if (!width || !height) return { ok: true, contentType, bytes };

    const minWidth = platform === "instagram" ? IG_MIN_WIDTH : FB_MIN_WIDTH;
    if (width < minWidth) {
        return {
            ok: false,
            error: `That photo is only ${width}px wide — it needs to be at least ${minWidth}px to post. Upload a higher-resolution image.`,
            width, height, contentType, bytes,
        };
    }

    if (platform === "instagram") {
        const aspect = width / height;
        if (aspect < IG_MIN_ASPECT || aspect > IG_MAX_ASPECT) {
            const shape = aspect < IG_MIN_ASPECT ? "too tall" : "too wide";
            return {
                ok: false,
                error: `Instagram won't accept this photo — it's ${shape} (${width}×${height}). Instagram needs somewhere between 4:5 portrait and 1.91:1 landscape. Crop it and re-upload.`,
                width, height, contentType, bytes,
            };
        }
    }

    return { ok: true, width, height, contentType, bytes };
}
