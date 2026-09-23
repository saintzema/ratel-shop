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
 * Nothing here rewrites the database: the original data URI stays exactly
 * where it is, and the image route reads it back out. Fixing the stored data
 * is a separate migration.
 */

export function isInlineImage(url: unknown): url is string {
    return typeof url === "string" && url.startsWith("data:");
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
