import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { recognizePlate, hasVisionConfig } from "@/lib/plate-ocr";

export const dynamic = "force-dynamic";

/**
 * POST /api/vehicles/ocr-plate { imageBase64 } — reads a plate number off a
 * photo taken during vehicle registration, as an auto-fill SUGGESTION only.
 * The driver still confirms/edits the field, and admin still inspects the
 * vehicle's actual photos before approval (see /admin/drivers) — this never
 * substitutes for that.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasVisionConfig) {
        return NextResponse.json({ error: "Plate scanning isn't set up yet — enter it manually for now." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const imageBase64 = String(body?.imageBase64 || "");
    if (!imageBase64) return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    if (imageBase64.length > 8_000_000) {
        return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    }

    const result = await recognizePlate(imageBase64);
    if (result.error && !result.guess) {
        return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ guess: result.guess, rawText: result.rawText });
}
