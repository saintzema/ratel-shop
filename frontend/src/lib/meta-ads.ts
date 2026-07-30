// Real Meta Marketing API campaign creation — boosts an ALREADY-PUBLISHED
// Page/Instagram post (via object_story_id) rather than uploading fresh
// creative, since every campaign here originates from a post the Social
// Composer already published. Runs entirely under FairPrice's own ad
// account/Business Manager — sellers never need their own Ads Manager.
//
// Requires META_AD_ACCOUNT_ID (the "act_..." id, without the "act_" prefix)
// and META_ADS_ACCESS_TOKEN (a System User token with ads_management on that
// account) to be configured. Neither exists yet as of this writing — every
// call below fails closed with a clear "not configured" error rather than
// guessing at credentials, so nothing spends real money until the account
// is actually set up.

const API_VERSION = "v21.0";

export function isMetaAdsConfigured(): boolean {
    return !!(process.env.META_AD_ACCOUNT_ID && process.env.META_ADS_ACCESS_TOKEN);
}

interface CreateBoostParams {
    pageId: string;
    postId: string; // Page post id (e.g. from /{page-id}/photos' post_id) or IG media id
    platform: "facebook" | "instagram";
    igUserId?: string; // required when platform === "instagram"
    budgetKobo: number; // total spend across the whole flight, excludes our markup
    days: number;
}

interface CreateBoostResult {
    success: boolean;
    campaignId?: string;
    adSetId?: string;
    adId?: string;
    error?: string;
}

async function metaPost(path: string, body: Record<string, any>): Promise<any> {
    const token = process.env.META_ADS_ACCESS_TOKEN!;
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, access_token: token }),
    });
    return res.json();
}

async function deleteMetaObject(id: string) {
    const token = process.env.META_ADS_ACCESS_TOKEN!;
    await fetch(`https://graph.facebook.com/${API_VERSION}/${id}?access_token=${token}`, { method: "DELETE" }).catch(() => {});
}

/**
 * Creates Campaign -> AdSet -> AdCreative (pointing at the existing post) ->
 * Ad, in that order, PAUSED at every step until the final Ad activates. If
 * any step fails partway, deletes whatever was already created rather than
 * leaving an orphaned half-built campaign silently sitting in the ad account.
 */
export async function createBoostCampaign(params: CreateBoostParams): Promise<CreateBoostResult> {
    if (!isMetaAdsConfigured()) {
        return { success: false, error: "Ad account not configured on our end yet — contact support." };
    }
    const adAccount = `act_${process.env.META_AD_ACCOUNT_ID}`;
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
        });
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
        });
        if (adSet.error || !adSet.id) {
            if (campaignId) await deleteMetaObject(campaignId);
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
        });
        if (creative.error || !creative.id) {
            if (campaignId) await deleteMetaObject(campaignId);
            return { success: false, error: creative.error?.message || "Meta rejected the creative (post may not be boostable)." };
        }
        creativeId = creative.id;

        // 4. Ad — links it all together and goes live
        const ad = await metaPost(`${adAccount}/ads`, {
            name: `FairPrice boost — ${params.postId}`,
            adset_id: adSetId,
            creative: { creative_id: creativeId },
            status: "ACTIVE",
        });
        if (ad.error || !ad.id) {
            if (campaignId) await deleteMetaObject(campaignId);
            return { success: false, error: ad.error?.message || "Meta rejected ad creation." };
        }

        // Now that the Ad is live, flip the Campaign/AdSet to ACTIVE too.
        // (campaignId/adSetId are guaranteed non-null here — every early return
        // above covers the cases where they'd still be null.)
        await metaPost(campaignId as string, { status: "ACTIVE" });
        await metaPost(adSetId as string, { status: "ACTIVE" });

        return { success: true, campaignId: campaignId as string, adSetId: adSetId as string, adId: ad.id };
    } catch (err: any) {
        if (campaignId) await deleteMetaObject(campaignId); // cascades adset/ad/creative cleanup
        return { success: false, error: err?.message || "Ad campaign creation failed." };
    }
}
