import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

/**
 * POST /api/orders/upload-message-image
 *
 * Order-chat image attachments were previously base64-encoded client-side and
 * embedded directly into chat_messages (localStorage) and the
 * /api/orders/sync-messages POST body — a single photo runs 1-3MB as base64,
 * which blew through the localStorage quota (triggering a "nuclear clear" of
 * unrelated cached data) and 413'd the sync request outright.
 *
 * This uploads to blob storage and returns a real URL instead. No auth check —
 * intentionally matching /api/orders/sync-messages' existing model (guest
 * buyers have no JWT in this app, and that endpoint already accepts messages
 * from anyone who knows the orderId). Kept as its own endpoint rather than
 * routing through /api/upload, which requires a valid JWT for every caller.
 */
export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const orderId = formData.get("orderId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
        }
        const MAX_BYTES = 10 * 1024 * 1024;
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });
        }

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json({ error: "Image uploads are not configured" }, { status: 500 });
        }

        const ext = file.name.split(".").pop() || "jpg";
        const filename = `order-messages/${orderId || "unknown"}/${Date.now()}.${ext}`;
        const blob = await put(filename, file, { access: "public" });

        return NextResponse.json({ success: true, url: blob.url });
    } catch (error: any) {
        console.error("Order message image upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
