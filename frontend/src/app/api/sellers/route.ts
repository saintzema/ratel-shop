import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { getUserFromRequest } from "@/lib/jwt";
import { resolveStoreUrl } from "@/lib/seller-utils";

export async function GET(req: Request) {
    try {
        const user = getUserFromRequest(req);
        const { searchParams } = new URL(req.url);
        const includeInactive = searchParams.get("all") === "true";
        const updatedAfter = searchParams.get("updated_after");
        const slugParam = searchParams.get("slug");

        // Public slug lookup — store pages are public, no auth required
        if (slugParam) {
            const slugLower = slugParam.toLowerCase();
            const selFields = {
                id: true, userId: true, businessName: true, description: true,
                logoUrl: true, coverImageUrl: true, category: true, verified: true,
                rating: true, trustScore: true, status: true, kycStatus: true,
                storeUrl: true, location: true, createdAt: true, ownerName: true,
                subscriptionPlan: true, planExpiryDate: true,
            } as const;

            // 1. Match by storeUrl field directly
            let found = await db.seller.findFirst({ where: { storeUrl: slugLower, status: "active" }, select: selFields });

            // 2. Fallback: match all active sellers by slugified business name
            if (!found) {
                const all = await db.seller.findMany({ where: { status: "active" }, select: selFields });
                found = all.find(s => s.businessName.toLowerCase().replace(/\s+/g, '-') === slugLower) || null;
            }

            if (!found) return NextResponse.json(null, { headers: { "Cache-Control": "public, s-maxage=10" } });
            const s = found;
            return NextResponse.json({
                ...s, user_id: s.userId, business_name: s.businessName,
                logo_url: s.logoUrl, cover_image_url: s.coverImageUrl,
                trust_score: s.trustScore, kyc_status: s.kycStatus,
                store_url: s.storeUrl, owner_name: s.ownerName,
                subscription_plan: s.subscriptionPlan,
                plan_expiry_date: s.planExpiryDate ? s.planExpiryDate.toISOString() : null,
            }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
        }

        let whereClause: any = includeInactive ? {} : { status: "active" as const };

        // Security: Filter by userId if NOT an admin
        if (!user || user.role !== "admin") {
            // If logged in as a seller/customer, only show their own stores
            if (user) {
                whereClause.userId = user.userId;
            } else {
                // Not logged in -> Only show active public stores
                whereClause.status = "active";
                // If they are asking for "all=true" but not logged in, reject or ignore
                if (includeInactive) {
                    // For now, just ignore it and keep status active
                }
            }
        }

        if (updatedAfter) {
            whereClause.updatedAt = { gte: new Date(updatedAfter) };
        }

        const sellers = await db.seller.findMany({
            where: whereClause,
            select: {
                id: true,
                userId: true,
                businessName: true,
                description: true,
                logoUrl: true,
                coverImageUrl: true,
                category: true,
                verified: true,
                rating: true,
                trustScore: true,
                status: true,
                kycStatus: true,
                storeUrl: true,
                location: true,
                createdAt: true,
                ownerName: true,
                subscriptionPlan: true,
                planExpiryDate: true,
            },
            take: 100
        });

        const mappedSellers = sellers.map(s => ({
            ...s,
            user_id: s.userId,
            business_name: s.businessName,
            logo_url: s.logoUrl,
            cover_image_url: s.coverImageUrl,
            trust_score: s.trustScore,
            kyc_status: s.kycStatus,
            store_url: s.storeUrl,
            owner_name: s.ownerName,
            subscription_plan: s.subscriptionPlan,
            plan_expiry_date: s.planExpiryDate ? s.planExpiryDate.toISOString() : null,
            created_at: s.createdAt.toISOString(),
        }));

        return NextResponse.json(mappedSellers, {
            headers: {
                // Admin/sync requests bypass cache; public store list gets 60s CDN cache
                "Cache-Control": includeInactive
                    ? "no-store"
                    : "public, s-maxage=60, stale-while-revalidate=600"
            }
        });
    } catch (error: any) {
        console.error("Database fetch error:", error);
        return NextResponse.json({
            error: "Service Temporarily Unavailable",
            message: "The seller registry is currently unreachable.",
            code: "DB_OFFLINE"
        }, {
            status: 500,
            headers: { 
                "X-DB-Status": "offline",
                "Cache-Control": "no-store" 
            }
        });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userId = body.user_id || body.userId;
        const userPayload = getUserFromRequest(req);

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Security check: cannot create store for someone else unless admin
        if (userPayload && userId !== userPayload.userId && userPayload.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Unauthorized access" }, { status: 403 });
        }

        // Preserve admin role: an admin who also owns a store must NOT be downgraded to "seller".
        const existingUser = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
        const preservedRole = existingUser?.role === "admin" ? "admin" : "seller";

        const user = await db.user.upsert({
            where: { id: userId },
            update: { role: preservedRole },
            create: {
                id: userId,
                email: body.owner_email || `${body.id}_owner@fairprice.ng`,
                name: body.business_name || body.ownerName || "Seller",
                role: "seller",
            }
        });

        const validSellerStatuses = ['pending', 'active', 'frozen', 'banned'];
        let safeStatus = body.status || 'active';
        if (!validSellerStatuses.includes(safeStatus)) {
            if (safeStatus === 'verified') safeStatus = 'active';
            else if (safeStatus === 'rejected') safeStatus = 'frozen';
            else safeStatus = 'active';
        }

        const validKycStatuses = ['not_submitted', 'pending', 'approved', 'rejected'];
        let safeKycStatus = body.kyc_status || 'not_submitted';
        if (!validKycStatuses.includes(safeKycStatus)) {
            safeKycStatus = 'not_submitted';
        }

        const sellerId = body.id || `s_${Date.now()}`;
        const resolvedStoreUrl = await resolveStoreUrl(body.store_url, body.business_name, sellerId);

        const sellerData = {
            id: sellerId,
            userId: user.id,
            businessName: body.business_name,
            description: body.description || "",
            logoUrl: body.logo_url,
            coverImageUrl: body.cover_image_url,
            category: body.category || "other",
            verified: body.verified || false,
            rating: body.rating || 0,
            trustScore: body.trust_score || 50,
            status: safeStatus as any,
            kycStatus: safeKycStatus as any,
            bankName: body.bank_name,
            accountNumber: body.account_number,
            accountName: body.account_name,
            storeUrl: resolvedStoreUrl,
            location: body.location,
            weeklyOrders: body.weekly_orders,
            currencies: body.currencies || [],
            staffCount: body.staff_count,
            physicalStores: body.physical_stores,
            ownerName: body.owner_name || user.name,
            ownerEmail: body.owner_email || user.email,
            subscriptionPlan: body.subscription_plan || body.subscriptionPlan || "Starter",
            planExpiryDate: body.plan_expiry_date || body.planExpiryDate ? new Date(body.plan_expiry_date || body.planExpiryDate) : null,
            idDocumentUrl: body.id_document_url,
            cacDocumentUrl: body.cac_document_url,
            cacRcNumber: body.cac_rc_number,
            businessRegistered: body.business_registered ?? false,
        };

        // Enforce Subscription Limits for NEW sellers
        const existingSellers = await db.seller.findMany({
            where: { userId: user.id }
        });

        const isNew = !existingSellers.find(s => s.id === sellerData.id);
        
        if (isNew) {
            // Get the subscription plan of the primary seller or user
            // For now, we'll check the first seller's plan as the "account plan"
            const primarySeller = existingSellers[0];
            const plan = primarySeller?.subscriptionPlan || "Starter";
            
            const limits: Record<string, number> = {
                "Starter": 1,
                "Pro": 2,
                "Growth": 3,
                "Scale": 10
            };
            
            const limit = limits[plan] || 1;
            
            if (existingSellers.length >= limit) {
                return NextResponse.json({ 
                    error: "Limit Reached", 
                    message: `Your current ${plan} plan allows up to ${limit} business(es). Please upgrade to add more.`,
                    code: "PLAN_LIMIT_REACHED"
                }, { status: 403 });
            }
        }

        const seller = await db.seller.upsert({
            where: { id: sellerData.id },
            update: {
                ...sellerData,
                id: undefined,
            },
            create: sellerData,
        });

        broadcast({ type: "seller_updated", id: seller.id });

        return NextResponse.json(seller);
    } catch (error: any) {
        console.error("Seller API error:", error);
        return NextResponse.json({ error: "Database temporarily unavailable", queued: true }, {
            status: 500,
            headers: { "Retry-After": "30" }
        });
    }
}
