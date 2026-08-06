// Central switchboard for ad monetization. Every value is optional and reads
// from env — until the real AdMob/AdSense accounts exist and these are set,
// every ad surface no-ops (renders nothing / hides its trigger) rather than
// throwing or showing a broken placeholder.

export const AD_CONFIG = {
    // Google AdSense — powers the native in-feed ad shown in product search/
    // browse results. Same script works identically on the website and inside
    // the Capacitor-wrapped app (it's still just a WebView loading the site).
    adsense: {
        clientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
        inFeedSlotId: process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT_ID || "",
    },
    // AdMob — powers the native rewarded-video ad (watch an ad, get a
    // discount credit). Only usable inside the native app shell, not on web.
    admob: {
        iosAppId: process.env.NEXT_PUBLIC_ADMOB_APP_ID_IOS || "",
        androidAppId: process.env.NEXT_PUBLIC_ADMOB_APP_ID_ANDROID || "",
        iosRewardedUnitId: process.env.NEXT_PUBLIC_ADMOB_REWARDED_UNIT_ID_IOS || "",
        androidRewardedUnitId: process.env.NEXT_PUBLIC_ADMOB_REWARDED_UNIT_ID_ANDROID || "",
    },
    // What a completed rewarded-ad view earns the buyer.
    rewardedAd: {
        creditAmount: 500, // ₦500
        creditValidityHours: 2,
        cooldownHours: 24, // one reward per user per this window
    },
} as const;

export const isAdSenseConfigured = () => !!AD_CONFIG.adsense.clientId && !!AD_CONFIG.adsense.inFeedSlotId;

export const getRewardedUnitId = (platform: "ios" | "android"): string =>
    platform === "ios" ? AD_CONFIG.admob.iosRewardedUnitId : AD_CONFIG.admob.androidRewardedUnitId;

export const isAdMobRewardedConfigured = (platform: "ios" | "android") => !!getRewardedUnitId(platform);
