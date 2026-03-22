
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/addresses?userId=X
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ addresses: [] });
        }

        const addresses = await db.address.findMany({
            where: { userId },
            orderBy: { isDefault: "desc" },
        });

        // Map DB schema to frontend format
        const mapped = addresses.map(a => ({
            id: a.id,
            userId: a.userId,
            label: a.label,
            firstName: a.street.split(" ")[0] || "", // stored flat
            lastName: "",
            phone: a.phone || "",
            street: a.street,
            city: a.city,
            state: a.state,
            country: a.country,
            isDefault: a.isDefault,
            type: a.label.toLowerCase() === "work" ? "work" : a.label.toLowerCase() === "home" ? "home" : "other",
        }));

        return NextResponse.json({ addresses: mapped });
    } catch (error: any) {
        console.error("Addresses GET Error:", error);
        return NextResponse.json({ addresses: [] });
    }
}

// POST /api/addresses — create or update
export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.userId || !body.street || !body.state) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // If updating an existing address
        if (body.id && !body.id.startsWith("addr_")) {
            const updated = await db.address.update({
                where: { id: body.id },
                data: {
                    label: body.label || "Home",
                    street: body.street,
                    city: body.city || "",
                    state: body.state,
                    country: body.country || "Nigeria",
                    isDefault: body.isDefault || false,
                    phone: body.phone || null,
                },
            });
            return NextResponse.json({ address: updated });
        }

        // If setting as default, unset all others first
        if (body.isDefault) {
            await db.address.updateMany({
                where: { userId: body.userId },
                data: { isDefault: false },
            });
        }

        const address = await db.address.create({
            data: {
                userId: body.userId,
                label: body.label || "Home",
                street: body.street,
                city: body.city || "",
                state: body.state,
                country: body.country || "Nigeria",
                isDefault: body.isDefault || false,
                phone: body.phone || null,
            },
        });

        return NextResponse.json({ address });
    } catch (error: any) {
        console.error("Addresses POST Error:", error);
        return NextResponse.json({ error: error.message || "Failed to save address" }, { status: 500 });
    }
}

// DELETE /api/addresses?id=X
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Address ID required" }, { status: 400 });
        }

        await db.address.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Addresses DELETE Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
