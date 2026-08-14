import sharp from "sharp";

/**
 * Faint tiled "FAIRPRICE.NG" watermark for seller-uploaded product photos —
 * the same trick Jiji uses ("POSTED ON JIJI").
 *
 * Why it's worth doing: listing photos get scraped and re-posted on other
 * marketplaces and WhatsApp within hours. A visible-but-unobtrusive mark makes
 * a stolen photo trace back here, and makes re-listing someone else's stock on
 * a competitor look obviously second-hand.
 *
 * Deliberately low-contrast: it must not fight the product. If it makes the
 * photo look worse, sellers will route around it (upload elsewhere, link
 * externally) and we lose both the photo quality AND the attribution.
 */

const WATERMARK_TEXT = "FAIRPRICE.NG";

/** Below this, a tiled watermark is more damage than protection. */
const MIN_DIMENSION = 300;

function buildOverlaySvg(width: number, height: number): Buffer {
    // Scale with the image so the mark reads the same at any resolution.
    const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.055));
    const stepX = fontSize * 11;
    const stepY = fontSize * 6;

    const marks: string[] = [];
    // Start off-canvas so the rotated text still covers the corners.
    for (let y = -stepY; y < height + stepY; y += stepY) {
        for (let x = -stepX; x < width + stepX; x += stepX) {
            marks.push(
                `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" ` +
                `font-size="${fontSize}" font-weight="bold" fill="#ffffff" ` +
                `fill-opacity="0.16" stroke="#000000" stroke-opacity="0.05" stroke-width="0.5" ` +
                `transform="rotate(-30 ${x} ${y})">${WATERMARK_TEXT}</text>`
            );
        }
    }

    return Buffer.from(
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${marks.join("")}</svg>`
    );
}

/**
 * Returns a watermarked JPEG buffer, or the ORIGINAL buffer unchanged if the
 * image can't be processed. Never throws: a watermark failing is not a reason
 * to fail a seller's upload — losing the photo is far worse than losing the mark.
 */
export async function watermarkImage(input: Buffer): Promise<{ buffer: Buffer; applied: boolean; contentType: string }> {
    try {
        const image = sharp(input, { failOn: "none" });
        const meta = await image.metadata();

        if (!meta.width || !meta.height) {
            return { buffer: input, applied: false, contentType: "image/jpeg" };
        }
        // Animated GIFs/WebP would lose their animation through this path.
        if ((meta.pages ?? 1) > 1) {
            return { buffer: input, applied: false, contentType: `image/${meta.format || "jpeg"}` };
        }
        if (meta.width < MIN_DIMENSION || meta.height < MIN_DIMENSION) {
            return { buffer: input, applied: false, contentType: `image/${meta.format || "jpeg"}` };
        }

        const overlay = buildOverlaySvg(meta.width, meta.height);
        const out = await image
            .rotate() // honour EXIF orientation before compositing, or the mark lands sideways
            .composite([{ input: overlay, top: 0, left: 0 }])
            .jpeg({ quality: 86, mozjpeg: true })
            .toBuffer();

        return { buffer: out, applied: true, contentType: "image/jpeg" };
    } catch {
        return { buffer: input, applied: false, contentType: "image/jpeg" };
    }
}
