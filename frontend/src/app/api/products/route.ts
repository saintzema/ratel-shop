import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categoryMatchTerms } from "@/lib/category-aliases";
import { broadcast } from "@/lib/realtime-service";
import { getUserFromRequest, JWTPayload } from "@/lib/jwt";
import { parseLocationFromQuery, locationTier } from "@/lib/location-search";

const SITE_URL = "https://www.fairprice.ng";
function productSlug(name: string | null | undefined): string {
    return (name || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// A seller-scoped write is allowed if the requester is an admin, or the requester
// owns the target seller record (by userId or ownerEmail match).
async function userOwnsSeller(sellerId: string | undefined | null, user: JWTPayload): Promise<boolean> {
    if (user.role === "admin") return true;
    if (!sellerId) return false;
    // An invited teammate isn't the real owner, but IS allowed to manage this
    // seller's products in general — canEditPrice/canEditStock (checked
    // separately below) is what actually gates the two fields the seller
    // wanted staff to never touch unsupervised.
    if (user.staffOf === sellerId) return true;
    const seller = await db.seller.findUnique({
        where: { id: sellerId },
        select: { userId: true, ownerEmail: true },
    });
    if (!seller) return false;
    return seller.userId === user.userId || (!!user.email && seller.ownerEmail === user.email);
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const includeInactive = searchParams.get("all") === "true";
        const updatedAfter = searchParams.get("updated_after");
        const cursor = searchParams.get("cursor") || undefined;
        const sellerIdFilter = searchParams.get("sellerId") || undefined;
        const rawQ = (searchParams.get("q") || "").trim();
        // Keep the limit high for admin, but manageable
        const limit = includeInactive ? undefined : Math.min(parseInt(searchParams.get("limit") || "50"), 1000);

        // Location: either explicit filter params (from the SRP's state/city dropdowns)
        // or parsed out of free text ("cars in Maitama, Abuja" → city=Maitama, state=Abuja
        // (FCT), leaving "cars" as the actual product query). Explicit params win if both
        // are somehow present.
        const explicitState = searchParams.get("state") || null;
        const explicitCity = searchParams.get("city") || null;
        const parsedLocation = rawQ ? parseLocationFromQuery(rawQ) : { state: null, city: null, remainingQuery: rawQ };
        const targetState = explicitState || parsedLocation.state;
        const targetCity = explicitCity || parsedLocation.city;
        const q = (explicitState || explicitCity) ? rawQ : parsedLocation.remainingQuery;
        const hasLocation = !!(targetState || targetCity);

        const whereClause: any = includeInactive
            ? {}
            : {
                isActive: true,
                seller: {
                    is: {
                        status: "active"
                    }
                },
                // QR/direct-payment products are ephemeral checkout artifacts, not real
                // catalog listings — they were showing up in homepage/search/store-page
                // browsing for random customers who never scanned the QR. Both admin
                // Catalog Control and the seller's own Products page use ?all=true, so
                // this exclusion only affects genuinely public-facing fetches.
                isDirectPayment: false,
                // Belt-and-braces: the seller edit page can silently flip isDirectPayment
                // back to false if it loaded a stale local-cache copy of the product that
                // predates that field (see the update-path fix below), so also exclude by
                // the qr-pay- id convention every direct-payment product is created with.
                id: { not: { startsWith: "qr-pay-" } },
            };

        if (sellerIdFilter) {
            whereClause.sellerId = sellerIdFilter;
        }

        if (updatedAfter) {
            whereClause.updatedAt = { gte: new Date(updatedAfter) };
        }

        // DB-side text search: filter at the database so the client never has to pull
        // and fuzzy-match the whole catalog (the old SRP fetched 200 and filtered locally,
        // which breaks past 200 products). Match each whitespace-separated term against
        // name / category / tags. Case-insensitive.
        // Explicit category browse (SRP category pills). Distinct from `q`, which
        // fuzzy-matches name/category/tags — tapping "Cars" should return the Cars
        // category, not every product whose name happens to contain "cars".
        // Written into AND (not OR) so it composes with the `q` branch below —
        // which also writes OR on its short-query path — instead of one silently
        // clobbering the other when a category and a query are both present.
        //
        // Matched by ALIAS and `contains`, never `equals`: the stored categories
        // are free text ("Vehicles", "automotive accessories", "Phones & Tablets")
        // while browse pills say "Cars"/"Smartphones". An equals-match between
        // those two vocabularies returns zero rows, which is exactly how browsing
        // Cars ended up showing an empty catalog on top of 27 real vehicles.
        const categoryParam = (searchParams.get("category") || "").trim();
        const catTerms = categoryMatchTerms(categoryParam);
        if (catTerms.length > 0) {
            whereClause.AND = [
                ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
                {
                    OR: catTerms.flatMap(term => [
                        { category: { contains: term, mode: "insensitive" } },
                        { subcategory: { contains: term, mode: "insensitive" } },
                        { name: { contains: term, mode: "insensitive" } },
                    ]),
                },
            ];
        }

        if (q) {
            const terms = q.split(/\s+/).filter(t => t.length > 1).slice(0, 6);
            if (terms.length > 0) {
                // ANY *distinctive* term may match — not EVERY term, and not just
                // any term at all.
                //
                // Requiring every word meant "red corolla" returned nothing even
                // where Corollas existed, because no listing contained both words.
                // But matching on any word is just as bad in the other direction:
                // "red" alone pulled up a screen protector and a lawn mower, which
                // reads as broken search rather than an empty shelf.
                //
                // So: match on the words that actually identify the product (4+
                // chars — "corolla", "toyota", "inverter") and ignore short filler
                // ("red", "new", "hp") unless filler is all the shopper typed. A
                // genuine near-miss then returns the right neighbours, and a query
                // with no real local match returns nothing and correctly falls
                // through to the global/AI search instead of padding with noise.
                const distinctive = terms.filter(t => t.length >= 4);
                const matchTerms = distinctive.length > 0 ? distinctive : terms;
                whereClause.AND = [
                    ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
                    {
                        OR: matchTerms.flatMap(term => [
                            { name: { contains: term, mode: "insensitive" } },
                            { category: { contains: term, mode: "insensitive" } },
                            { subcategory: { contains: term, mode: "insensitive" } },
                            { tags: { has: term.toLowerCase() } },
                        ]),
                    },
                ];
            } else {
                whereClause.OR = [
                    { name: { contains: q, mode: "insensitive" } },
                    { category: { contains: q, mode: "insensitive" } },
                ];
            }
        }

        // 1. ADDED: Fetch the real total count from the DB
        // This is what fixes the "255" display issue.
        const totalCount = await db.product.count({ where: whereClause });

        const productSelect = {
            id: true,
            sellerId: true,
            sellerName: true,
            name: true,
            description: true,
            price: true,
            originalPrice: true,
            recommendedPrice: true,
            category: true,
            imageUrl: true,
            images: true,
            stock: true,
            priceFlag: true,
            isSponsored: true,
            isTrending: true,
            isActive: true,
            avgRating: true,
            reviewCount: true,
            soldCount: true,
            highlights: true,
            specs: true,
            financingAvailable: true,
            createdAt: true,
            slug: true,
            viewCount: true,
            phoneViewCount: true,
            chatCount: true,
            ...(hasLocation ? { seller: { select: { state: true, city: true } } } : {}),
        } as any;

        // 2. Fetch the specific page/batch of products
        let products: any[];
        let nextCursor: string | null = null;

        if (q || hasLocation) {
            // Relevance-ranked search: pull a wider candidate pool of DB matches, then rank
            // by how well each NAME matches the query (exact > prefix > all-words > substring
            // > tag/category-only), with popularity tiebreakers. This makes a searched product
            // instantly surface near the top in NavSearch + SRP — not buried by newest-first
            // ordering — even when the catalogue has thousands of items.
            //
            // When a location is in play (typed in the query or picked from the state/city
            // filter), results are grouped into tiers FIRST — same city, then same state,
            // then everywhere else — and only ranked by text/popularity relevance WITHIN
            // each tier. This is the Jiji-style behavior: local listings surface first, but
            // nothing outside the area is hidden, it just sorts after.
            const pool = await db.product.findMany({
                where: whereClause,
                select: productSelect,
                orderBy: { createdAt: "desc" },
                take: 300,
            });
            const ql = q.toLowerCase();
            const qWords = ql.split(/\s+/).filter((w) => w.length > 1);
            const relevance = (p: any): number => {
                const name = (p.name || "").toLowerCase();
                let s = 0;
                if (!ql) s += 50; // no text query — location/browse only, everything ties on text score
                else if (name === ql) s += 1000;
                else if (name.startsWith(ql)) s += 600;
                else if (name.includes(ql)) s += 400;
                else if (qWords.length > 0 && qWords.every((w) => name.includes(w))) s += 250;
                else s += 50; // matched via category/tags only
                s += Math.min((p.soldCount || 0) / 10, 30);
                s += (p.avgRating || 0) * 3;
                if (p.isSponsored) s += 20;
                return s;
            };
            products = pool
                .sort((a, b) => {
                    if (hasLocation) {
                        const tierA = locationTier({ state: targetState, city: targetCity }, (a as any).seller?.state, (a as any).seller?.city);
                        const tierB = locationTier({ state: targetState, city: targetCity }, (b as any).seller?.state, (b as any).seller?.city);
                        if (tierA !== tierB) return tierA - tierB;
                    }
                    return relevance(b) - relevance(a);
                })
                .slice(0, limit || 60);
        } else {
            products = await db.product.findMany({
                where: whereClause,
                ...(limit ? { take: limit + 1 } : {}),
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                select: productSelect,
                orderBy: { createdAt: "desc" },
            });
            const hasMore = limit ? products.length > limit : false;
            if (hasMore) products.pop();
            nextCursor = hasMore ? products[products.length - 1]?.id : null;
        }

        const mappedProducts = products.map((p: any) => ({
            ...p,
            seller_id: p.sellerId,
            seller_name: p.sellerName,
            original_price: p.originalPrice,
            recommended_price: p.recommendedPrice,
            image_url: p.imageUrl,
            price_flag: p.priceFlag,
            is_sponsored: p.isSponsored,
            is_trending: p.isTrending,
            is_active: p.isActive,
            financing_available: p.financingAvailable,
            avg_rating: p.avgRating,
            review_count: p.reviewCount,
            sold_count: p.soldCount,
            view_count: p.viewCount ?? 0,
            phone_view_count: p.phoneViewCount ?? 0,
            chat_count: p.chatCount ?? 0,
            created_at: p.createdAt.toISOString(),
            slug: p.slug || undefined,
        }));

        // 3. UPDATED: Return 'total' in the response
        return NextResponse.json({
            success: true,
            products: mappedProducts,
            total: totalCount,
            nextCursor
        }, {
            headers: {
                // Admin/sync requests bypass cache; a single seller's own store page
                // (sellerId filter) gets a much shorter cache — sellers routinely check
                // their store page right after listing a product (e.g. via WhatsApp) to
                // confirm it went up, and a 30s CDN cache + 5min stale-while-revalidate
                // made that check show stale data for minutes. The general public catalog
                // feed still benefits from the longer cache since it's high-traffic and
                // freshness-to-the-second doesn't matter there the way it does right after
                // a seller's own upload.
                "Cache-Control": includeInactive
                    ? "no-store"
                    : sellerIdFilter
                        ? "public, s-maxage=3, stale-while-revalidate=10"
                        : "public, s-maxage=30, stale-while-revalidate=300"
            }
        });
    } catch (error: any) {
        console.error("Database fetch error:", error);
        
        // RESILIENCE FALLBACK: If DB is out of sync or offline, return seed data
        // This prevents the "0 products" or "Service Unavailable" issue on the frontend.
        try {
            const { SEED_PRODUCTS } = require("@/lib/data");
            return NextResponse.json({ 
                success: true, 
                products: SEED_PRODUCTS.slice(0, 50), 
                total: SEED_PRODUCTS.length, 
                nextCursor: null,
                _offlineMode: true 
            }, {
                headers: { "X-DB-Status": "out-of-sync" }
            });
        } catch (fallbackErr) {
            return NextResponse.json({ 
                error: "Service Temporarily Unavailable",
                message: "The database is currently offline or misconfigured.",
                code: "DB_OFFLINE"
            }, { status: 500 });
        }
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // This handler had no auth check at all — unlike the POST{action:"delete"}
        // fallback right below it, which correctly checks ownership. Mirror it here.
        const user = getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const target = await db.product.findUnique({ where: { id }, select: { sellerId: true } });
        if (target && !(await userOwnsSeller(target.sellerId, user))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.product.delete({ where: { id } });
        broadcast({ type: "product_updated", id });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // FALLBACK: Handle deletion via POST if DELETE method is blocked
        if (body.action === "delete" && body.id) {
            const user = getUserFromRequest(req);
            if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

            const target = await db.product.findUnique({ where: { id: body.id }, select: { sellerId: true } });
            if (target && !(await userOwnsSeller(target.sellerId, user))) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            await db.product.delete({ where: { id: body.id } });
            broadcast({ type: "product_updated", id: body.id });
            return NextResponse.json({ success: true, message: "Product deleted via POST fallback" });
        }

        // ─── Image-Only Update Guard ───
        // Background hydration sends { id, image_url, images, _imageOnly: true }
        // We MUST NOT run a full upsert (which would wipe name/price/description).
        // Instead, do a targeted update on just the image fields.
        if (body._imageOnly && body.id) {
            const imageUpdate: any = {};
            const isCleanUrl = (u?: string) => u && !u.includes('placeholder') && !u.includes('wikimedia.org') && !u.includes('wikipedia.org');
            if (isCleanUrl(body.image_url)) imageUpdate.imageUrl = body.image_url;
            if (body.images && Array.isArray(body.images)) imageUpdate.images = body.images;
            
            if (Object.keys(imageUpdate).length === 0) {
                return NextResponse.json({ success: true, skipped: true });
            }

            try {
                await db.product.update({
                    where: { id: body.id.length > 50 ? body.id.slice(0, 50).replace(/-+$/, "") : body.id },
                    data: imageUpdate,
                });
                broadcast({ type: "product_updated", id: body.id });
                return NextResponse.json({ success: true, imageOnly: true });
            } catch (imgErr: any) {
                // Product may not exist in DB yet — that's fine, skip silently
                if (imgErr?.code === 'P2025') {
                    return NextResponse.json({ success: true, skipped: true, reason: "product_not_found" });
                }
                throw imgErr;
            }
        }

        // ─── Auth + Ownership Guard ───
        // Full create/update (price, stock, name, description, etc.) requires the
        // requester to be authenticated and to either be an admin or own the target
        // seller record. Without this, anyone could upsert any product for any seller.
        const authedUser = getUserFromRequest(req);
        if (!authedUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await userOwnsSeller(body.seller_id, authedUser))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // ─── Staff permission gate (price/stock) ───
        // An invited teammate can generally manage this seller's products, but not
        // silently overhike a price or fudge a stock count without being explicitly
        // granted that — the exact scenario a store owner invites staff wants to
        // prevent while overseas/away. Only applies to existing products (staff
        // creating a brand-new listing is a different, less risky action); for an
        // existing product, any price/stock in the payload that differs from what's
        // already in the DB gets reverted to the current value when unauthorized.
        if (authedUser.staffOf === body.seller_id) {
            const perms = authedUser.staffPermissions;
            const current = await db.product.findUnique({ where: { id: body.id }, select: { price: true, stock: true } });
            if (current) {
                if (!perms?.canEditPrice && body.price !== undefined && body.price !== current.price) {
                    body.price = current.price;
                }
                if (!perms?.canEditStock && body.stock !== undefined && body.stock !== current.stock) {
                    body.stock = current.stock;
                }
            }
        }

        // Ensure "global-partners" seller exists if saving a globally sourced product
        if (body.seller_id === 'global-partners') {
            try {
                const globalUser = await db.user.upsert({
                    where: { id: 'global-user' },
                    update: {},
                    create: {
                        id: 'global-user',
                        email: 'global@fairprice.app',
                        name: 'FairPrice Global',
                        role: 'admin'
                    }
                });

                await db.seller.upsert({
                    where: { id: 'global-partners' },
                    update: { status: 'active' },
                    create: {
                        id: 'global-partners',
                        userId: globalUser.id,
                        businessName: 'Global Stores',
                        ownerEmail: 'global@fairprice.app',
                        description: 'Global Sourcing Partners',
                        category: 'All',
                        status: 'active',
                        verified: true,
                        rating: 5.0,
                        trustScore: 100.0
                    }
                });
            } catch (upsertErr) {
                console.warn("Global seller upsert skipped (likely already exists):", (upsertErr as any)?.code);
            }
        }

        // Enforce Seller Status: Products can only be active if the seller is active
        const seller = await db.seller.findUnique({
            where: { id: body.seller_id },
            select: { status: true }
        });

        const isSellerActive = seller?.status === "active";

        // ─── Enforce GMC Missing Attribute Rules for New Products ───
        let rawSpecs = typeof body.specs === 'object' && body.specs !== null ? { ...body.specs } : {};
        const catLabel = (body.category || 'General').toLowerCase();
        const productName = (body.name || '').toLowerCase();

        if (!rawSpecs.Color && !rawSpecs.color && !rawSpecs.Colour && !rawSpecs.colour) {
            rawSpecs.Color = 'Multicolor';
        }

        const hasSize = rawSpecs.Size || rawSpecs.size || rawSpecs["Sizes Available"] || rawSpecs.Dimensions || rawSpecs.size_options;
        if (!hasSize && (catLabel.includes('fashion') || catLabel.includes('cloth') || catLabel.includes('apparel') || productName.includes('wig') || productName.includes('hair') || productName.includes('backpack'))) {
            rawSpecs.Size = 'Standard';
        }

        const productId = body.id.length > 50 ? body.id.slice(0, 50).replace(/-+$/, "") : body.id;

        const productData = {
            id: productId,
            sellerId: body.seller_id,
            sellerName: body.seller_name,
            name: body.name,
            description: body.description || "",
            price: body.price,
            originalPrice: body.original_price,
            recommendedPrice: body.recommended_price,
            category: body.category,
            imageUrl: body.image_url,
            images: body.images || [],
            stock: body.stock ?? 100,
            priceFlag: body.price_flag || "none",
            isSponsored: body.is_sponsored || false,
            isTrending: body.is_trending || false,
            isActive: isSellerActive ? (body.is_active !== false) : false,
            avgRating: body.avg_rating || 0,
            reviewCount: body.review_count || 0,
            soldCount: body.sold_count || 0,
            highlights: body.highlights || [],
            specs: rawSpecs,
            financingAvailable: body.financing_available || false,
            externalUrl: body.external_url,
            slug: body.slug,
            isDirectPayment: body.is_direct_payment || false,
        } as any;

        // Build a SAFE update object that won't wipe heavy content fields if they're missing
        // from the payload. This protects against the sync-store stripping description/images
        // from localStorage before feeding them into the background save call.
        const safeUpdate = { ...productData };
        if (!body.description && body.description !== "") delete safeUpdate.description;
        if (!body.highlights?.length && !body._fromEditPage) delete safeUpdate.highlights;
        if (!body.images?.length && !body._fromEditPage) delete safeUpdate.images;
        // A product's is_direct_payment status is set once at creation and must never
        // be flipped false by a later edit — the seller edit page derives it from a
        // locally-cached copy of the product that can predate this field, which was
        // silently un-flagging real QR products and leaking them into the marketplace.
        if (!body.is_direct_payment) delete safeUpdate.isDirectPayment;
        // Never overwrite a real image with a placeholder or an encyclopaedia image.
        // Wikimedia/Wikipedia article thumbnails are never valid product images.
        const isBadImageUrl = (u?: string) =>
            !!u && (u.includes('placeholder') || u.includes('wikimedia.org') || u.includes('wikipedia.org'));
        if (isBadImageUrl(safeUpdate.imageUrl)) delete safeUpdate.imageUrl;
        // Always keep specs (even if empty) since they may be intentionally cleared

        const product = await (db.product as any).upsert({
            where: { id: productData.id },
            update: safeUpdate,
            create: productData,
        });

        // Broadcast update for real-time sync
        broadcast({ type: "product_updated", id: product.id });

        // ─── SEO: make the update visible to Google fast ───
        // 1) Invalidate the cached (ISR) product page so the next crawl/visit gets fresh
        //    name/image/description/specs immediately instead of waiting up to 1 hour.
        const slug = productSlug(product.name);
        try {
            revalidatePath(`/product/${product.id}/${slug}`);
            revalidatePath("/sitemap.xml");
        } catch { /* revalidate is best-effort */ }

        // 2) Ping Google's Indexing API so it re-crawls this URL (URL_UPDATED).
        //    Fire-and-forget; never blocks the response.
        const canonicalUrl = `${SITE_URL}/product/${product.id}/${slug}`;
        fetch(`${SITE_URL}/api/google-index`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: [canonicalUrl] }),
        }).catch(() => {});

        return NextResponse.json(product);
    } catch (error: any) {
        console.error("Product creation error:", error);
        return NextResponse.json({ success: true, queued: true }, {
            status: 202,
            headers: { "X-DB-Status": "offline" }
        });
    }
}
