import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { isInlineImage, uploadInlineImage } from "@/lib/inline-images";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/migrate-inline-images  — admin only.
 *
 * One-time cleanup for products whose photo was saved as a base64 `data:` URI
 * instead of a URL. Each one is decoded, stored in Blob, and the column
 * rewritten to the public URL. GET reports how many are left without changing
 * anything.
 *
 * Deliberately batched (`limit`, default 25) and idempotent: it only ever
 * touches rows that still contain a data URI, so it is safe to call again,
 * and a serverless timeout mid-run leaves the already-converted rows
 * converted. Products whose image can't be stored (not an image, over the
 * size cap, corrupt base64) are reported in `failed` and left exactly as they
 * are — the read path still serves them via /api/products/[id]/image, so
 * nothing breaks for a shopper either way.
 */

async function findInlineProducts(take: number) {
    // Prisma's list filters can't prefix-match the ELEMENTS of a String[], and
    // pulling every product's images[] into memory to check would re-create the
    // exact megabyte problem this route exists to remove. So the ids are found
    // in the database with a single indexed-ish scan, and only those rows are
    // then loaded in full.
    const rows = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Product"
        WHERE "imageUrl" LIKE 'data:%'
           OR EXISTS (SELECT 1 FROM unnest("images") AS img WHERE img LIKE 'data:%')
        LIMIT ${take}
    `;
    if (rows.length === 0) return [];
    return db.product.findMany({
        where: { id: { in: rows.map(r => r.id) } },
        select: { id: true, imageUrl: true, images: true },
    });
}

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const pending = await findInlineProducts(500);
    return NextResponse.json({
        pending: pending.length,
        ids: pending.slice(0, 50).map(p => p.id),
    });
}

export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body?.limit) || 25, 100);

    const targets = await findInlineProducts(limit);
    const migrated: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const product of targets) {
        const data: { imageUrl?: string; images?: string[] } = {};
        let lostAnImage = false;

        if (isInlineImage(product.imageUrl)) {
            const url = await uploadInlineImage(product.imageUrl);
            if (url) data.imageUrl = url; else lostAnImage = true;
        }
        if (Array.isArray(product.images) && product.images.some(isInlineImage)) {
            const resolved = await Promise.all(
                product.images.map(async img => (isInlineImage(img) ? await uploadInlineImage(img) : img)),
            );
            if (resolved.some(u => u == null)) lostAnImage = true;
            data.images = resolved.filter((u): u is string => typeof u === "string" && u.length > 0);
        }

        // Never half-write: if any image on this product refused to store, the
        // row keeps its data URIs and gets reported, rather than silently
        // losing a photo the seller uploaded.
        if (lostAnImage) {
            failed.push({ id: product.id, reason: "not a storable image (wrong type, too large, or corrupt)" });
            continue;
        }
        if (Object.keys(data).length === 0) continue;

        try {
            await db.product.update({ where: { id: product.id }, data });
            migrated.push(product.id);
        } catch (e: any) {
            failed.push({ id: product.id, reason: e?.message || "database update failed" });
        }
    }

    const remaining = (await findInlineProducts(500)).length;
    return NextResponse.json({ migrated: migrated.length, failed, remaining, ids: migrated });
}
