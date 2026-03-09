import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all cached searches for the Admin Catalog
export async function GET(req: Request) {
    try {
        const caches = await db.searchCache.findMany({
            orderBy: { updatedAt: "desc" },
            take: 50 // Limit to last 50 queries to prevent payload bloat
        });

        // Format as Record<string, Product[]> so DemoStore can ingest it directly
        const formattedCache: Record<string, any[]> = {};
        caches.forEach(cache => {
            formattedCache[cache.query] = cache.products as any[];
        });

        return NextResponse.json(formattedCache);
    } catch (error) {
        console.error("Database fetch error for Search Cache:", error);
        return NextResponse.json({ error: "Failed to fetch search cache" }, { status: 500 });
    }
}

// POST a new global search result to persistent cache
export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.query || !body.products) {
            return NextResponse.json({ error: "Missing query or products" }, { status: 400 });
        }

        const normalizedQuery = body.query.toLowerCase().trim();

        const searchCache = await db.searchCache.upsert({
            where: { query: normalizedQuery },
            update: {
                products: body.products,
                updatedAt: new Date()
            },
            create: {
                query: normalizedQuery,
                products: body.products,
            },
        });

        return NextResponse.json(searchCache);
    } catch (error: any) {
        console.error("Search cache creation error:", error);
        return NextResponse.json({ error: error.message || "Failed to persist search" }, { status: 500 });
    }
}
