import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all cached searches for the Admin Catalog
export async function GET(req: Request) {
    try {
        const caches = await db.searchCache.findMany({
            orderBy: { updatedAt: "desc" },
            take: 500 // Limit to last 500 queries as requested
        });

        // Format as Record<string, Product[]> so DataSyncService can ingest it directly
        const formattedCache: Record<string, any[]> = {};
        caches.forEach(cache => {
            formattedCache[cache.query] = cache.products as any[];
        });

        return NextResponse.json(formattedCache);
    } catch (error) {
        console.error("Database fetch error for Search Cache:", error);
        return NextResponse.json({}, {
            status: 503,
            headers: { "X-DB-Status": "offline" }
        });
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

        // Check global system setting. Fallback to true if missing.
        let settings = await db.systemSetting.findUnique({ where: { id: "global" } });
        const cacheEnabled = settings ? settings.globalSearchCaching : true;

        if (!cacheEnabled && !body.isAdmin) {
            return NextResponse.json({ message: "Search caching is currently disabled globally" }, { status: 200 });
        }

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
