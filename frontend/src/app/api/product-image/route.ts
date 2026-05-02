import { NextResponse } from "next/server";

export const revalidate = 86400; // Prevent Vercel from statically caching this free-tier proxy

const RL_MAP = new Map<string, { count: number; reset: number }>();
const RL_MAX = 60;
const RL_WINDOW_MS = 60_000;

function checkRateLimit(req: Request): boolean {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const entry = RL_MAP.get(ip);
    if (!entry || now > entry.reset) {
        RL_MAP.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
        return true;
    }
    entry.count++;
    return entry.count <= RL_MAX;
}

// We prioritize Serper.dev for Google Image Search (2,500 free queries)
// or standard Google Custom Search API.
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

/**
 * Core image search logic shared between GET and POST handlers.
 * Tries Serper → Google CSE → Wikipedia in priority order.
 */
/**
 * Core image search logic shared between GET and POST handlers.
 * Tries Serper → Google CSE → Wikipedia in priority order.
 */
async function searchProductImage(query: string, category?: string): Promise<{ imageUrl: string | null; imageUrls?: string[]; source?: string }> {
    const cat = category?.toLowerCase() || "";
    let searchModifier = " official product image high resolution";
    
    // ─── Category-Specific Source Prioritization ───
    if (cat.includes("car") || cat.includes("vehicle") || cat.includes("automotive")) {
        searchModifier = " professional clean exterior photo high res site:cars45.com OR site:jiji.ng OR site:autochek.africa OR site:netcarshow.com";
    } else if (cat.includes("machinery") || cat.includes("industrial") || cat.includes("tool")) {
        searchModifier = " industrial high quality clean photo site:alibaba.com OR site:directindustry.com OR site:made-in-china.com";
    } else if (cat.includes("electronics") || cat.includes("computing") || cat.includes("phone")) {
        searchModifier = " official high resolution product shot site:apple.com OR site:samsung.com OR site:gsmarena.com OR site:amazon.com";
    } else if (cat.includes("fashion") || cat.includes("clothing")) {
        searchModifier = " high resolution studio fashion photography site:zara.com OR site:asos.com OR site:jumia.com.ng";
    }

    const isValidImage = (url: string) => {
        if (!url) return false;
        const lower = url.toLowerCase();
        return !lower.includes("placeholder") &&
               !lower.includes("no-image") &&
               !lower.includes("no_image") &&
               !lower.includes("default.") &&
               !lower.includes("x-icon") &&
               !lower.includes("logo") &&
               !lower.includes("avatar") &&
               !lower.includes("transparent") &&
               !lower.includes("clear.png") &&
               !lower.endsWith(".svg") &&
               !lower.endsWith(".gif") &&
               lower.startsWith("http");
    };

    // ─── Strategy 1: Serper.dev Google Image Search (best quality) ───
    if (SERPER_API_KEY) {
        try {
            const response = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: {
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    q: query + searchModifier,
                    num: 20, // Increase pool for better filtering
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.images?.length > 0) {
                    const images = data.images
                        .map((img: any) => img.imageUrl)
                        .filter(isValidImage);
                    if (images.length > 0) {
                        return { imageUrl: images[0], imageUrls: images, source: "serper" };
                    }
                }
            }

            // Fallback: Relaxed search if specific search failed
            const responseRelaxed = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: {
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    q: query + " product",
                    num: 10,
                }),
            });
            if (responseRelaxed.ok) {
                const data = await responseRelaxed.json();
                if (data?.images?.length > 0) {
                    const images = data.images
                        .map((img: any) => img.imageUrl)
                        .filter(isValidImage);
                    if (images.length > 0) {
                        return { imageUrl: images[0], imageUrls: images, source: "serper_relaxed" };
                    }
                }
            }
        } catch (e) {
            console.error("Serper image search failed:", e);
        }
    }

    // ─── Strategy 2: Google Custom Search API ───
    if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query + searchModifier)}&searchType=image&num=5`
            );
            if (response.ok) {
                const data = await response.json();
                if (data.items?.length > 0) {
                    const images = data.items.map((item: any) => item.link).filter(isValidImage);
                    if (images.length > 0) {
                        return { imageUrl: images[0], imageUrls: images, source: "google_cse" };
                    }
                }
            }
        } catch (e) {
            console.error("Google CSE image search failed:", e);
        }
    }

    // ─── Strategy 3: Wikipedia free fallback ───
    try {
        const searchRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`
        );
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            const title = searchData?.query?.search?.[0]?.title;
            if (title) {
                const imgRes = await fetch(
                    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=1000`
                );
                if (imgRes.ok) {
                    const imgData = await imgRes.json();
                    const pages = imgData?.query?.pages;
                    if (pages) {
                        const pageId = Object.keys(pages)[0];
                        const source = pages[pageId]?.thumbnail?.source;
                        if (source) {
                            return { imageUrl: source, source: "wikipedia" };
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Wikipedia image fallback failed:", e);
    }

    return { imageUrl: null };
}

/**
 * GET /api/product-image?q=<product name>&category=<cat>
 * Used by the single-product "Get Image" button in the edit modal.
 */
export async function GET(req: Request) {
    if (!checkRateLimit(req)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const category = searchParams.get("category") || searchParams.get("cat");

    if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    try {
        const result = await searchProductImage(query, category || undefined);
        if (result.imageUrl) {
            return NextResponse.json(result);
        }
        return NextResponse.json({ imageUrl: null }, { status: 404 });
    } catch (error) {
        console.error("Error in product-image GET:", error);
        return NextResponse.json(
            { error: "Failed to fetch image", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

/**
 * POST /api/product-image
 * Used by the bulk "Update Images" scan in Admin Catalog Control.
 * Accepts { productTitle: string, category: string } in the JSON body.
 */
export async function POST(req: Request) {
    if (!checkRateLimit(req)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const body = await req.json();
        const query = body.productTitle || body.query || body.q;
        const category = body.category;

        if (!query) {
            return NextResponse.json({ error: "productTitle is required" }, { status: 400 });
        }

        const result = await searchProductImage(query, category);
        if (result.imageUrl) {
            return NextResponse.json(result);
        }
        return NextResponse.json({ imageUrl: null }, { status: 404 });
    } catch (error) {
        console.error("Error in product-image POST:", error);
        return NextResponse.json(
            { error: "Failed to fetch image", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
