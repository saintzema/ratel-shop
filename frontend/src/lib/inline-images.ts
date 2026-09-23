/**
 * Base64 `data:` images are the single heaviest thing this app ever puts on
 * the wire. A handful of products were saved with the photo inlined straight
 * into the imageUrl column — one of them is 543 KB on its own — and because
 * the homepage's sync pulls `/api/products?limit=200`, every visitor was
 * downloading them all, on every load, before anything on the page could be
 * tapped. That one list response measured 4.6 MB; the main thread then froze
 * for seconds parsing it and writing it to localStorage, which is exactly the
 * "the app is hanging" people were reporting.
 *
 * So list responses never carry the bytes. Each inline image is swapped for a
 * short URL pointing at /api/products/[id]/image, which serves the decoded
 * bytes with a long cache header — the browser fetches it once, only for the
 * cards actually on screen, and only the first time.
 *
 * `stripInlineImages` is the read-side safety net for rows that still hold a
 * data URI. `uploadInlineImage` is the write-side cure: anything arriving as
 * base64 is decoded and put in Blob storage before it can reach a column, so
 * no new row can ever be created with bytes inside it. The admin migration at
 * /api/admin/migrate-inline-images walks the existing rows through the same
 * function.
 */
import { put } from "@vercel/blob";

export function isInlineImage(url: unknown): url is string {
    return typeof url === "string" && url.startsWith("data:");
}

/** Nothing legitimate needs a bigger single photo, and the decode is synchronous. */
export const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
};

export interface DecodedDataUri { contentType: string; body: Buffer }

/** Splits a data URI into its media type and raw bytes, or null if malformed. */
export function decodeDataUri(uri: string): DecodedDataUri | null {
    // [\s\S] rather than the `s` flag — the compile target predates dotAll.
    const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(uri);
    if (!match) return null;
    const [, contentType, isBase64, payload] = match;
    try {
        const body = isBase64
            ? Buffer.from(payload, "base64")
            : Buffer.from(decodeURIComponent(payload), "utf8");
        return { contentType: contentType || "application/octet-stream", body };
    } catch {
        return null;
    }
}

/**
 * Decodes one base64 image and stores it in Vercel Blob, returning the public
 * URL to keep in the database instead.
 *
 * Returns the input untouched when it isn't a data URI, and null when it is
 * one we refuse (not an image, too big, malformed, or the upload failed) —
 * callers decide whether a refused image means "drop this photo" or "reject
 * the whole request".
 */
export async function uploadInlineImage(value: unknown, keyPrefix = "products"): Promise<string | null> {
    if (!isInlineImage(value)) return typeof value === "string" ? value : null;

    const decoded = decodeDataUri(value);
    if (!decoded) return null;
    if (!decoded.contentType.startsWith("image/")) return null;
    if (decoded.body.length > MAX_INLINE_IMAGE_BYTES) return null;

    const ext = EXT_BY_TYPE[decoded.contentType] ?? "bin";
    try {
        const blob = await put(
            `${keyPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`,
            decoded.body,
            { access: "public", contentType: decoded.contentType, addRandomSuffix: false },
        );
        return blob.url;
    } catch {
        return null;
    }
}

/**
 * Runs a whole product's imagery through uploadInlineImage. Images that can't
 * be stored are dropped rather than silently kept as megabytes of base64 —
 * a missing photo is recoverable, a frozen homepage is not.
 */
export async function uploadInlineImagesFor(input: { imageUrl?: unknown; images?: unknown }): Promise<{ imageUrl?: string | null; images?: string[] }> {
    const out: { imageUrl?: string | null; images?: string[] } = {};
    if (isInlineImage(input.imageUrl)) {
        out.imageUrl = await uploadInlineImage(input.imageUrl);
    }
    if (Array.isArray(input.images) && input.images.some(isInlineImage)) {
        const resolved = await Promise.all(input.images.map(img => uploadInlineImage(img)));
        out.images = resolved.filter((u): u is string => typeof u === "string" && u.length > 0);
    }
    return out;
}

/**
 * Replaces inline images on ONE product with the served-by-URL form. `index`
 * on the query string tells the image route which entry of `images[]` to
 * decode; the primary imageUrl is index-less.
 */
export function stripInlineImages<T extends { id: string; imageUrl?: string | null; images?: unknown }>(product: T): T {
    let out = product;
    if (isInlineImage(product.imageUrl)) {
        out = { ...out, imageUrl: `/api/products/${product.id}/image` };
    }
    if (Array.isArray(product.images) && product.images.some(isInlineImage)) {
        out = {
            ...out,
            images: product.images.map((img, i) =>
                isInlineImage(img) ? `/api/products/${product.id}/image?index=${i}` : img),
        };
    }
    return out;
}
