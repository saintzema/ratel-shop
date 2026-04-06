import { NextResponse } from "next/server";

// We prioritize Serper.dev for Google Image Search (2,500 free queries)
// or standard Google Custom Search API.
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    try {
        // Method 1: Serper.dev API (Highly recommended for direct Google Image scraping)
        if (SERPER_API_KEY) {
            const response = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: {
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ q: query + " product high quality", num: 1 }), // Get highest quality product image
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.images && data.images.length > 0) {
                    return NextResponse.json({ imageUrl: data.images[0].imageUrl });
                }
            }
        }
        
        // Method 2: Google Custom Search API
        else if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX) {
            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query + " product")}&searchType=image&num=1`
            );
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    return NextResponse.json({ imageUrl: data.items[0].link });
                }
            }
        }

        // Method 3: Fallback Free Wikipedia Search (No keys required)
        else {
            // Grab the main entity page finding the most relevant title
            const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const title = searchData?.query?.search?.[0]?.title;
                if (title) {
                    const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=1000`);
                    if (imgRes.ok) {
                        const imgData = await imgRes.json();
                        const pages = imgData?.query?.pages;
                        if (pages) {
                            const pageId = Object.keys(pages)[0];
                            const source = pages[pageId]?.thumbnail?.source;
                            if (source) {
                                return NextResponse.json({ imageUrl: source, source: 'wikipedia' });
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({ imageUrl: null }, { status: 404 });

    } catch (error) {
        console.error("Error in product-image route:", error);
        return NextResponse.json(
            { error: "Failed to fetch image", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
