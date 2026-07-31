// Real Meta Marketing API campaign creation — boosts an ALREADY-PUBLISHED
// Page/Instagram post (via object_story_id) rather than uploading fresh
// creative, since every campaign here originates from a post the Social
// Composer already published. Runs entirely under FairPrice's own ad
// account/Business Manager — sellers never need their own Ads Manager.
//
// Credentials (ad account id + System User access token) are passed in
// explicitly rather than read from process.env here — the caller resolves
// them from SystemSetting (admin-editable, no redeploy needed) falling back
// to env vars for local dev. See resolveMetaAdsCredentials() below.

import { db } from "@/lib/db";

const API_VERSION = "v21.0";

export interface MetaAdsCredentials {
    adAccountId: string; // WITHOUT the "act_" prefix
    accessToken: string; // System User token with ads_management on that account
}

/**
 * DB (admin settings) first, env vars as a local-dev fallback. Returns null
 * if neither source has both values — callers must treat that as "ads
 * aren't set up yet" and fail closed, never guess at partial credentials.
 */
export async function resolveMetaAdsCredentials(): Promise<MetaAdsCredentials | null> {
    const settings = await db.systemSetting.findUnique({
        where: { id: "global" },
        select: { metaAdAccountId: true, metaAdsAccessToken: true },
    }).catch(() => null);

    const adAccountId = settings?.metaAdAccountId || process.env.META_AD_ACCOUNT_ID || null;
    const accessToken = settings?.metaAdsAccessToken || process.env.META_ADS_ACCESS_TOKEN || null;

    if (!adAccountId || !accessToken) return null;
    return { adAccountId, accessToken };
}

interface CreateBoostParams {
    pageId: string;
    postId: string; // Page post id (e.g. from /{page-id}/photos' post_id) or IG media id
    platform: "facebook" | "instagram";
    igUserId?: string; // required when platform === "instagram"
    budgetKobo: number; // total spend across the whole flight, excludes our markup
    days: number;
    credentials: MetaAdsCredentials;
}

interface CreateBoostResult {
    success: boolean;
    campaignId?: string;
    adSetId?: string;
    adId?: string;
    error?: string;
}

async function metaPost(path: string, body: Record<string, any>, token: string): Promise<any> {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, access_token: token }),
    });
    return res.json();
}

async function deleteMetaObject(id: string, token: string) {
    await fetch(`https://graph.facebook.com/${API_VERSION}/${id}?access_token=${token}`, { method: "DELETE" }).catch(() => {});
}

/**
 * Creates Campaign -> AdSet -> AdCreative (pointing at the existing post) ->
 * Ad, in that order, PAUSED at every step until the final Ad activates. If
 * any step fails partway, deletes whatever was already created rather than
 * leaving an orphaned half-built campaign silently sitting in the ad account.
 */
export async function createBoostCampaign(params: CreateBoostParams): Promise<CreateBoostResult> {
    const { accessToken: token, adAccountId } = params.credentials;
    const adAccount = `act_${adAccountId}`;
    const dailyBudgetKobo = Math.max(100000, Math.round(params.budgetKobo / params.days)); // Meta enforces a real minimum daily budget; ~₦1,000/day floor here is conservative

    let campaignId: string | null = null;
    let adSetId: string | null = null;
    let creativeId: string | null = null;

    try {
        // 1. Campaign
        const campaign = await metaPost(`${adAccount}/campaigns`, {
            name: `FairPrice boost — ${params.postId}`,
            objective: "OUTCOME_ENGAGEMENT",
            status: "PAUSED",
            special_ad_categories: [],
        }, token);
        if (campaign.error || !campaign.id) return { success: false, error: campaign.error?.message || "Meta rejected campaign creation." };
        campaignId = campaign.id;

        // 2. Ad Set — Nigeria-wide, engagement-optimized, daily budget in kobo
        const now = new Date();
        const end = new Date(now.getTime() + params.days * 24 * 60 * 60 * 1000);
        const adSet = await metaPost(`${adAccount}/adsets`, {
            name: `FairPrice boost adset — ${params.postId}`,
            campaign_id: campaignId,
            daily_budget: dailyBudgetKobo,
            billing_event: "IMPRESSIONS",
            optimization_goal: "POST_ENGAGEMENT",
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            targeting: { geo_locations: { countries: ["NG"] } },
            start_time: now.toISOString(),
            end_time: end.toISOString(),
            status: "PAUSED",
        }, token);
        if (adSet.error || !adSet.id) {
            if (campaignId) await deleteMetaObject(campaignId, token);
            return { success: false, error: adSet.error?.message || "Meta rejected ad set creation." };
        }
        adSetId = adSet.id;

        // 3. Ad Creative — points at the post that's already live, no re-upload
        const objectStoryId = params.platform === "instagram" && params.igUserId
            ? `${params.igUserId}_${params.postId}`
            : `${params.pageId}_${params.postId}`;
        const creative = await metaPost(`${adAccount}/adcreatives`, {
            name: `FairPrice boost creative — ${params.postId}`,
            object_story_id: objectStoryId,
        }, token);
        if (creative.error || !creative.id) {
            if (campaignId) await deleteMetaObject(campaignId, token);
            return { success: false, error: creative.error?.message || "Meta rejected the creative (post may not be boostable)." };
        }
        creativeId = creative.id;

        // 4. Ad — links it all together and goes live
        const ad = await metaPost(`${adAccount}/ads`, {
            name: `FairPrice boost — ${params.postId}`,
            adset_id: adSetId,
            creative: { creative_id: creativeId },
            status: "ACTIVE",
        }, token);
        if (ad.error || !ad.id) {
            if (campaignId) await deleteMetaObject(campaignId, token);
            return { success: false, error: ad.error?.message || "Meta rejected ad creation." };
        }

        // Now that the Ad is live, flip the Campaign/AdSet to ACTIVE too.
        // (campaignId/adSetId are guaranteed non-null here — every early return
        // above covers the cases where they'd still be null.)
        await metaPost(campaignId as string, { status: "ACTIVE" }, token);
        await metaPost(adSetId as string, { status: "ACTIVE" }, token);

        return { success: true, campaignId: campaignId as string, adSetId: adSetId as string, adId: ad.id };
    } catch (err: any) {
        if (campaignId) await deleteMetaObject(campaignId, token); // cascades adset/ad/creative cleanup
        return { success: false, error: err?.message || "Ad campaign creation failed." };
    }
}
