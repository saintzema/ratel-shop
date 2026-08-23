import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { resolveSellerForUser } from "@/lib/resolve-seller";
import { resolveMetaAdsCredentials, fetchManyCampaignInsights } from "@/lib/meta-ads";

export const dynamic = "force-dynamic";

/**
 * GET /api/seller/ads/insights
 *
 * Real performance for this seller's boosted campaigns, joined with what
 * actually happened on FairPrice afterwards.
 *
 * Meta can only tell us impressions, reach, clicks and spend — it has no idea
 * whether anyone then messaged the seller. The on-platform counters
 * (viewCount / phoneViewCount / chatCount on Product) close that loop, which is
 * the number a seller genuinely cares about: not "how many people saw it" but
 * "how many people contacted me".
 *
 * Read live from Meta rather than stored: adding columns to this schema has
 * previously failed the Vercel build (Prisma db push against the pooler), and
 * insights are cheap enough to fetch on demand.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller: any = await resolveSellerForUser(user, { id: true });
    if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

    const campaigns = await db.adCampaign.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    if (campaigns.length === 0) {
        return NextResponse.json({ campaigns: [], totals: null, configured: true });
    }

    const credentials = await resolveMetaAdsCredentials();
    if (!credentials) {
        // Ads aren't configured platform-side. Still return the campaign rows so
        // the seller sees what they paid for, just without live numbers.
        return NextResponse.json({
            configured: false,
            campaigns: campaigns.map(c => ({ ...c, insights: null })),
            totals: null,
        });
    }

    const ids = campaigns.map(c => c.metaCampaignId).filter(Boolean) as string[];
    const insights = await fetchManyCampaignInsights(ids, credentials);

    // On-platform outcome for every product that was boosted.
    const productIds = campaigns.map(c => c.productId).filter(Boolean) as string[];
    const products = productIds.length
        ? await db.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, viewCount: true, phoneViewCount: true, chatCount: true },
        })
        : [];
    const productById = new Map(products.map(p => [p.id, p]));

    const rows = campaigns.map(c => {
        const i = c.metaCampaignId ? insights[c.metaCampaignId] : null;
        const p = c.productId ? productById.get(c.productId) : null;
        const contacts = (p?.phoneViewCount || 0) + (p?.chatCount || 0);
        return {
            id: c.id,
            productId: c.productId,
            productName: p?.name || null,
            platform: c.platform,
            status: c.status,
            days: c.days,
            createdAt: c.createdAt,
            /** What the seller paid us, in naira. */
            chargedNaira: Math.round(c.totalChargedKobo / 100),
            /** What we spent with Meta, in naira. */
            adSpendNaira: Math.round(c.budgetKobo / 100),
            insights: i || null,
            onPlatform: p
                ? {
                    productViews: p.viewCount || 0,
                    phoneReveals: p.phoneViewCount || 0,
                    chatsStarted: p.chatCount || 0,
                    /** The metric that matters: people who actually reached out. */
                    contacts,
                    /** Of everyone the ad sent to the page, how many made contact. */
                    contactRatePct: i && i.linkClicks > 0
                        ? Math.round((contacts / i.linkClicks) * 1000) / 10
                        : null,
                    /** What each contact effectively cost, in naira. */
                    costPerContactNaira: contacts > 0
                        ? Math.round(c.totalChargedKobo / 100 / contacts)
                        : null,
                }
                : null,
        };
    });

    const totals = rows.reduce(
        (acc, r) => {
            acc.impressions += r.insights?.impressions || 0;
            acc.reach += r.insights?.reach || 0;
            acc.linkClicks += r.insights?.linkClicks || 0;
            acc.spend += r.insights?.spend || 0;
            acc.chargedNaira += r.chargedNaira;
            acc.contacts += r.onPlatform?.contacts || 0;
            return acc;
        },
        { impressions: 0, reach: 0, linkClicks: 0, spend: 0, chargedNaira: 0, contacts: 0 }
    );

    return NextResponse.json({ configured: true, campaigns: rows, totals });
}
