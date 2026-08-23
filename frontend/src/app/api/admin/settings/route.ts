import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const DEFAULT_SETTINGS = {
    id: "global",
    platformMargin: 2.5,
    serviceCharge: 1.5,
    standardCommission: 5.0,
    escrowFee: 1.0,
    escrowFeePayNow: 1950,
    doorstepFee: 4000,
    pickupFee: 2500,
    aiMonitoring: true,
    kycVerification: true,
    escrowRelease: 7,
    strictSeller: false,
    categoryMargins: {},
    stateShipping: {},
    codEnabled: true,
    codThreshold: 50000,
    codAllowExpensiveCategories: true,
    codGlobalEnabled: true,
    codGlobalThreshold: 50000,
    globalSearchCaching: true,
    waVerificationEnabled: false,
    payoutHitlThreshold: 50000,
    zema360PaidPlansOnly: false,
    supportConfig: {
        email: "hello@fairprice.ng",
        whatsapp: "2348162816305",
        whatsappOrderNumber: "2348162816305",
        office: "Victoria Island, Lagos, Nigeria",
        hours: "Mon - Sat: 8am - 10pm WAT",
        serviceCenters: []
    },
    updatedAt: new Date()
};

export async function GET() {
    try {
        let settings = await prisma.systemSetting.findUnique({
            where: { id: "global" }
        });

        if (!settings) {
            settings = await prisma.systemSetting.create({
                data: { id: "global" }
            });
        }

        // This endpoint is fetched from public, unauthenticated pages across
        // the app (checkout, navbar, contact/help, seller onboarding) for the
        // ordinary config fields — it is NOT admin-gated. metaAdsAccessToken
        // is a real Meta System User secret and must never round-trip to any
        // client, admin browser included. Expose only whether one is set.
        const { metaAdsAccessToken, ...safeSettings } = settings as any;
        return NextResponse.json({ ...safeSettings, metaAdsAccessTokenConfigured: !!metaAdsAccessToken });
    } catch (error) {
        console.error("Failed to fetch DB settings, falling back to defaults:", error);
        return NextResponse.json({ ...DEFAULT_SETTINGS, _offlineMode: true });
    }
}

export async function POST(req: Request) {
    try {
        // ADMIN ONLY.
        //
        // This had no authentication whatsoever, while spreading arbitrary body
        // fields straight into SystemSetting. Anyone on the internet could POST
        // here and rewrite platform configuration — set standardCommission to 0
        // so the platform earned nothing on every sale, or overwrite
        // metaAdAccountId / metaAdsAccessToken to point our ad spend at their own
        // Meta ad account. Verified exploitable against production (HTTP 200 with
        // no credentials) before this fix.
        //
        // The GET above is deliberately public — checkout, the navbar and seller
        // onboarding all read ordinary config from it, and it already redacts the
        // Meta token. Only writes are gated.
        const user = getUserFromRequest(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { id, createdAt, updatedAt, ...updatableFields } = body; // Destructure to exclude fields we shouldn't update directly if they are sent

        const settings = await prisma.systemSetting.upsert({
            where: { id: "global" },
            update: updatableFields,
            create: {
                id: "global",
                ...updatableFields
            }
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Failed to update settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
