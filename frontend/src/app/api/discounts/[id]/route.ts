import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../../realtime/route";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const discount = await (db as any).discount.delete({
            where: { id },
        });

        broadcast({ type: "discount_updated", sellerId: discount.sellerId });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
    }
}
