import { NextResponse } from "next/server";
import { getUserFromRequest, verifyToken } from "@/lib/jwt";
import { put } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Client-side direct-to-blob uploads for large files (videos).
// The browser calls POST /api/upload with { type: "blob.generate-client-token" }
// and we return a short-lived token; the client then uploads directly to Vercel Blob
// without passing the file through our function — no body-size limit applies.
export async function POST(req: Request): Promise<Response> {
    const contentType = req.headers.get("content-type") || "";

    // ── Path 1: client-side blob token handshake (for large files / videos) ───
    // @vercel/blob/client's upload() makes this request; it passes the JWT as both
    // an Authorization header AND as clientPayload — we accept either.
    if (contentType.includes("application/json")) {
        // Auth: prefer header, fall back to clientPayload (parsed after reading body below)
        const headerUser = getUserFromRequest(req);
        try {
            const body = (await req.json()) as HandleUploadBody;
            const result = await handleUpload({
                body,
                request: req,
                onBeforeGenerateToken: async (_pathname: string, clientPayload: string | null, _multipart: boolean) => {
                    // Resolve user from header auth or clientPayload JWT
                    const user = headerUser ?? (clientPayload ? verifyToken(clientPayload) : null);
                    if (!user) throw new Error("Unauthorized");
                    return {
                        allowedContentTypes: [
                            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
                            "video/mp4", "video/quicktime", "video/webm", "video/avi",
                            "video/x-msvideo", "video/x-matroska",
                        ],
                        maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
                        tokenPayload: JSON.stringify({ userId: user.userId }),
                    };
                },
                onUploadCompleted: async ({ blob }) => {
                    console.log("Client upload completed:", blob.url);
                },
            });
            return NextResponse.json(result);
        } catch (err: any) {
            return NextResponse.json({ error: err.message || "Token error" }, { status: 400 });
        }
    }

    // ── Path 2 auth (server-side uploads — form/multipart) ───────────────────
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Path 2: server-side upload (small images, existing flow) ─────────────
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const isVideo = file.type.startsWith("video/");
        const maxBytes = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;

        if (file.size > maxBytes) {
            const label = isVideo ? "100MB" : "5MB";
            return NextResponse.json({ error: `File too large (max ${label})` }, { status: 400 });
        }

        if (process.env.BLOB_READ_WRITE_TOKEN) {
            const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
            const folder = isVideo ? "product-videos" : "products";
            const filename = `${folder}/${user.userId || "unknown"}/${Date.now()}.${ext}`;
            const blob = await put(filename, file, { access: "public" });
            return NextResponse.json({ success: true, url: blob.url, name: file.name });
        }

        // Fallback: base64 (only practical for small images — videos should always use Blob)
        if (isVideo) {
            return NextResponse.json({ error: "Video upload requires BLOB_READ_WRITE_TOKEN" }, { status: 500 });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
        return NextResponse.json({ success: true, url: base64, name: file.name });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
