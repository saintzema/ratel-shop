import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }

        // Use Vercel Blob when token is available, otherwise fall back gracefully
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            const ext = file.name.split(".").pop() || "jpg";
            const filename = `products/${user.userId || "unknown"}/${Date.now()}.${ext}`;
            const blob = await put(filename, file, { access: "public" });
            return NextResponse.json({ success: true, url: blob.url, name: file.name });
        }

        // Fallback: base64 (works but bloats localStorage — set up BLOB_READ_WRITE_TOKEN to fix)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
        return NextResponse.json({ success: true, url: base64, name: file.name });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
