import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Persist a globally-sourced product (NavSearch / AI price discovery) to the DB so the
// server-rendered PDP resolves IDENTICAL data on every device. Before this, global
// products lived only in the searching device's localStorage and were re-fabricated
// per-device, producing the "same URL, different price/image" inconsistency.
//
// Idempotent: ensures the shared `global-partners` seller exists, then upserts the
// product by its stable `global-<slug>` id. Safe to call fire-and-forget on click.

const GLOBAL_SELLER_ID = "global-partners";
const GLOBAL_USER_ID = "global_partner";

function isValidGlobalId(id: unknown): id is string {
    return typeof id === "string" && /^global[-_]/i.test(id) && id.length <= 60;
}

async function ensureGlobalSeller() {
    // User first (Seller.userId FK → User, onDelete cascade)
    await db.user.upsert({
        where: { id: GLOBAL_USER_ID },
        update: {},
        create: {
            id: GLOBAL_USER_ID,
            email: "global_partner@fairprice.ng",
            name: "Global Stores",
            role: "seller",
        },
    });
    await db.seller.upsert({
        where: { id: GLOBAL_SELLER_ID },
        update: {},
        create: {
            id: GLOBAL_SELLER_ID,
            userId: GLOBAL_USER_ID,
            businessName: "Global Stores",
            description: "Verified global sourcing partner with FairPrice Escrow protection.",
            category: "general",
            currencies: ["NGN"],
            verified: true,
            status: "active",
        },
    });
}

export async function POST(req: Request) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const p = body?.product ?? body;
    const id = p?.id;

    if (!isValidGlobalId(id)) {
        return NextResponse.json({ error: "Not a global product id" }, { status: 400 });
    }
    if (!p?.name || typeof p.price !== "number" || p.price <= 0) {
        return NextResponse.json({ error: "Missing name or valid price" }, { status: 400 });
    }

    // ProductCondition enum only allows these; global results often send "good"/"new".
    const VALID_CONDITIONS = new Set(["brand_new", "used", "refurbished"]);
    const condition = VALID_CONDITIONS.has(p.condition) ? p.condition : "brand_new";
    const VALID_FLAGS = new Set(["fair", "overpriced", "too_low", "none", "great_deal"]);
    const priceFlag = VALID_FLAGS.has(p.price_flag) ? p.price_flag : "fair";

    try {
        // If it already exists, do nothing heavy — keep the first canonical record stable.
        const existing = await db.product.findUnique({ where: { id }, select: { id: true } });
        if (existing) {
            return NextResponse.json({ ok: true, id, created: false });
        }

        await ensureGlobalSeller();

        const images: string[] = Array.isArray(p.images)
            ? p.images.filter((u: any) => typeof u === "string" && u.length < 2000)
            : (typeof p.image_url === "string" ? [p.image_url] : []);

        await db.product.create({
            data: {
                id,
                sellerId: GLOBAL_SELLER_ID,
                sellerName: p.seller_name || "Global Stores",
                name: String(p.name).slice(0, 300),
                description: String(p.description || "").slice(0, 5000),
                price: p.price,
                originalPrice: typeof p.original_price === "number" ? p.original_price : undefined,
                recommendedPrice: typeof p.recommended_price === "number" ? p.recommended_price : p.price,
                category: p.category || "electronics",
                imageUrl: typeof p.image_url === "string" ? p.image_url : (images[0] || ""),
                images,
                stock: 1,
                priceFlag: priceFlag as any,
                isActive: true,
                avgRating: typeof p.avg_rating === "number" ? p.avg_rating : 0,
                reviewCount: typeof p.review_count === "number" ? p.review_count : 0,
                soldCount: typeof p.sold_count === "number" ? p.sold_count : 0,
                condition: condition as any,
                externalUrl: typeof p.source_url === "string" ? p.source_url : undefined,
                highlights: Array.isArray(p.highlights) ? p.highlights : [],
                specs: (p.specs && typeof p.specs === "object") ? p.specs : {},
                slug: typeof p.slug === "string" ? p.slug : undefined,
            },
        });

        return NextResponse.json({ ok: true, id, created: true });
    } catch (error: any) {
        console.error("[global-persist] failed:", error?.message);
        return NextResponse.json({ error: "Failed to persist global product" }, { status: 500 });
    }
}
