import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

export const runtime = "nodejs";

// GET /api/kyc
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sellerId = searchParams.get("sellerId");
        const fetchAll = searchParams.get("all") === "true";

        const whereClause: any = {};
        if (sellerId) whereClause.sellerId = sellerId;

        const submissions = await db.kYCSubmission.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc',
            },
            ...(fetchAll ? { take: 100 } : {}),
        });

        // Map to ensure frontend field consistency
        const mapped = submissions.map(s => ({
            ...s,
            seller_id: s.sellerId,
            seller_name: s.sellerName,
            id_type: s.idType,
            id_number: s.idNumber,
            document_url: s.documentUrl,
            reviewed_by: s.reviewedBy,
            review_notes: s.reviewNotes,
            created_at: s.createdAt,
            reviewed_at: s.reviewedAt,
        }));

        return NextResponse.json({ success: true, submissions: mapped });
    } catch (error: any) {
        console.error("KYC API Error:", error);
        return NextResponse.json({ success: true, submissions: [] }, {
            status: 503,
            headers: { "X-DB-Status": "offline" }
        });
    }
}

// POST /api/kyc
export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const newSubmission = await db.kYCSubmission.create({
            data: {
                sellerId: body.seller_id,
                sellerName: body.seller_name,
                idType: body.id_type,
                idNumber: body.id_number,
                documentUrl: body.document_url,
                status: 'pending',
            }
        });

        broadcast({ type: "kyc_updated", id: newSubmission.id });

        return NextResponse.json({ success: true, submission: newSubmission });
    } catch (error: any) {
        console.error("KYC POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
