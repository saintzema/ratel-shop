import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function resolveOwnSeller(userId: string, email?: string) {
    return db.seller.findFirst({ where: { OR: [{ userId }, ...(email ? [{ ownerEmail: email }] : [])] } });
}

// GET /api/seller/staff — list this seller's invited teammates.
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveOwnSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const staff = await db.sellerStaff.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ staff });
}

// POST /api/seller/staff  { email, canEditPrice, canEditStock, canManageDiscounts, canViewFinancials }
// Invites a teammate. Free for a seller's first 3 months on the platform —
// after that it requires a paid plan, matching the standing policy that
// Starter/free sellers get this as an early perk, not permanently.
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveOwnSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const withinFreeWindow = Date.now() - new Date(seller.joinedAt).getTime() < ninetyDaysMs;
    const isPaidPlan = seller.subscriptionPlan && seller.subscriptionPlan !== "Starter";
    if (!withinFreeWindow && !isPaidPlan) {
        return NextResponse.json({ error: "Team invites are free for your first 3 months, then require a paid plan. Upgrade in Plans & Billing to keep inviting teammates." }, { status: 402 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const email = (body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    if (email === user.email?.toLowerCase()) return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });

    const existing = await db.sellerStaff.findUnique({ where: { sellerId_invitedEmail: { sellerId: seller.id, invitedEmail: email } } });
    if (existing && existing.status !== "revoked") {
        return NextResponse.json({ error: "This person has already been invited" }, { status: 409 });
    }

    const staff = existing
        ? await db.sellerStaff.update({
            where: { id: existing.id },
            data: {
                status: "invited",
                canEditPrice: !!body.canEditPrice,
                canEditStock: !!body.canEditStock,
                canManageDiscounts: !!body.canManageDiscounts,
                canViewFinancials: !!body.canViewFinancials,
            },
        })
        : await db.sellerStaff.create({
            data: {
                sellerId: seller.id,
                invitedEmail: email,
                canEditPrice: !!body.canEditPrice,
                canEditStock: !!body.canEditStock,
                canManageDiscounts: !!body.canManageDiscounts,
                canViewFinancials: !!body.canViewFinancials,
            },
        });

    // Email the invite. This is the only channel that reaches someone who doesn't
    // have a FairPrice account yet — the in-app notification below can't, so
    // without this an invited teammate was never told anything at all.
    const perms = [
        body.canEditPrice && "edit prices",
        body.canEditStock && "edit stock and inventory",
        body.canManageDiscounts && "manage discounts",
        body.canViewFinancials && "view payouts and financials",
    ].filter(Boolean) as string[];

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.fairprice.ng";
    fetch(`${appUrl}/api/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            to: email,
            type: "TEAM_INVITE",
            payload: {
                businessName: seller.businessName,
                ownerEmail: email,
                dashboardUrl: `${appUrl}/signin?invited=1`,
                promoContent: perms.length
                    ? `You'll be able to ${perms.join(", ")}. Anything not listed stays owner-only.`
                    : "You'll be able to help manage the store. Price, stock, discounts and financials stay owner-only until the owner grants them.",
            },
        }),
    }).catch(e => console.error("[staff invite] email failed:", e));

    // In-app notification if this email already has an account — the invite still
    // works even if they don't (it activates on their first login, see issue-token).
    db.user.findUnique({ where: { email } }).then(invitedUser => {
        if (!invitedUser) return;
        return db.notification.create({
            data: {
                userId: invitedUser.id,
                type: "system",
                message: `${seller.businessName} invited you to help manage their store on FairPrice. Log in to get started.`,
                link: "/seller/dashboard",
            },
        });
    }).catch(() => { /* non-critical */ });

    return NextResponse.json({ staff });
}
