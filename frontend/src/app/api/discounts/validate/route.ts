import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");

        if (!code) {
            return NextResponse.json({ error: "Code required" }, { status: 400 });
        }

        const discount = await (db as any).discount.findFirst({
            where: { code: code.toUpperCase(), status: "active" },
        });

        if (!discount) {
            return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 });
        }

        return NextResponse.json(discount);
    } catch (error) {
        return NextResponse.json({ error: "Failed to validate discount" }, { status: 500 });
    }
}
