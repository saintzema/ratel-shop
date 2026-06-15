import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

/**
 * Financing Document Upload Endpoint
 * Links uploaded documents to a specific FinancingApplication.
 */

export async function POST(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const financingId = formData.get("financingId") as string;
        const documentType = formData.get("documentType") as string;
        const file = formData.get("file") as File;

        if (!financingId || !documentType || !file) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Verify Application exists and belongs to user (or is admin)
        const application = await prisma.financingApplication.findUnique({
            where: { id: financingId }
        });

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        if (application.userId !== user.userId && user.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 2. Validate Document Type
        const validTypes = [
            "cacDocumentUrl",
            "auditedFinancialsUrl",
            "cashFlowProjectionUrl",
            "bankStatementUrl",
            "companyProfileUrl",
            "energyAuditUrl",
            "vendorInvoiceUrl"
        ];

        if (!validTypes.includes(documentType)) {
            return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
        }

        // 3. Process File (Base64 for prototype, similar to /api/upload)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

        // 4. Update Application
        const updated = await prisma.financingApplication.update({
            where: { id: financingId },
            data: {
                [documentType]: base64,
                status: "under_review" // Automatically move to under_review once docs start coming in
            }
        });

        return NextResponse.json({
            success: true,
            message: "Document uploaded successfully",
            applicationId: updated.id,
            documentType
        });

    } catch (error: any) {
        console.error("Financing Document Upload Error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
