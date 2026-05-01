import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";

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

        // Limit file size to 2MB for now
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert to base64 for "persistent" local-first storage
        // In a real app, we would upload to S3/Cloudinary here.
        const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

        // Return the data URL. In our frontend, we'll save this to the Seller record.
        return NextResponse.json({ 
            success: true, 
            url: base64,
            name: file.name
        });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
