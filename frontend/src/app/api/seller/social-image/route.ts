import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { put } from "@vercel/blob";
import sharp from "sharp";

/**
 * POST /api/seller/social-image  { imageUrl }
 *
 * Returns a public URL for an image that is guaranteed to satisfy Instagram's
 * feed constraints, re-rendering it only if the original doesn't already fit.
 *
 * Instagram rejects anything outside 4:5 (0.8) to 1.91:1, which knocks out a lot
 * of ordinary phone photos — a 750×1000 product shot (0.75) is "too tall" and
 * fails. Telling a seller to go crop and re-upload is a dead end for the exact
 * person this feature exists for, so we do it for them.
 *
 * Deliberately PADS rather than crops: cropping a product photo to fit can cut
 * the product itself out of frame. Padding onto a white canvas keeps the whole
 * item visible and reads as a clean catalogue shot.
 */

const IG_MIN_ASPECT = 4 / 5;   // 0.8
const IG_MAX_ASPECT = 1.91;

export async function POST(req: Request) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { imageUrl } = await req.json().catch(() => ({}));
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
        return NextResponse.json({ error: "A public image URL is required." }, { status: 400 });
    }

    try {
        const res = await fetch(imageUrl, { redirect: "follow" });
        if (!res.ok) {
            return NextResponse.json({ error: "Couldn't load that image." }, { status: 400 });
        }
        const input = Buffer.from(await res.arrayBuffer());

        const meta = await sharp(input, { failOn: "none" }).metadata();
        if (!meta.width || !meta.height) {
            return NextResponse.json({ error: "That file isn't a readable image." }, { status: 400 });
        }

        const aspect = meta.width / meta.height;
        if (aspect >= IG_MIN_ASPECT && aspect <= IG_MAX_ASPECT) {
            // Already valid — don't burn a re-upload on it.
            return NextResponse.json({ url: imageUrl, adjusted: false });
        }

        // Pad to the nearest allowed ratio: too-tall → 4:5, too-wide → 1.91:1.
        const target = aspect < IG_MIN_ASPECT ? IG_MIN_ASPECT : IG_MAX_ASPECT;
        let canvasW: number;
        let canvasH: number;
        if (aspect < target) {
            canvasH = meta.height;
            canvasW = Math.round(meta.height * target);
        } else {
            canvasW = meta.width;
            canvasH = Math.round(meta.width / target);
        }

        const output = await sharp(input, { failOn: "none" })
            .rotate() // honour EXIF before measuring/padding
            .resize({
                width: canvasW,
                height: canvasH,
                fit: "contain",
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .jpeg({ quality: 90, mozjpeg: true })
            .toBuffer();

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json(
                { error: "Image storage isn't configured, so we couldn't reformat this photo." },
                { status: 500 }
            );
        }

        const blob = await put(
            `social-ready/${user.userId || "unknown"}/${Date.now()}.jpg`,
            output,
            { access: "public", contentType: "image/jpeg" }
        );

        return NextResponse.json({
            url: blob.url,
            adjusted: true,
            from: `${meta.width}×${meta.height}`,
            to: `${canvasW}×${canvasH}`,
        });
    } catch (err: any) {
        console.error("[social-image] failed:", err);
        return NextResponse.json({ error: "Couldn't prepare that image for posting." }, { status: 500 });
    }
}
