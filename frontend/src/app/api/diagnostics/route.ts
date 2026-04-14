import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    const dbUrl = process.env.DATABASE_URL || "";
    const redactedUrl = dbUrl ? `${dbUrl.substring(0, 10)}...${dbUrl.substring(dbUrl.length - 5)}` : "not set";
    const isLocalhostFallback = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        vercel_branch: process.env.VERCEL_GIT_COMMIT_REF || "local",
        database: {
            url_present: !!dbUrl,
            url_pattern: redactedUrl,
            is_localhost_fallback: isLocalhostFallback,
            connection_test: "pending"
        },
        auth: {
            nextauth_secret_present: !!process.env.NEXTAUTH_SECRET,
            nextauth_url: process.env.NEXTAUTH_URL || "not set",
        },
        recommendations: [] as string[]
    };

    if (isLocalhostFallback && process.env.NODE_ENV === "production") {
        diagnostics.recommendations.push("CRITICAL: Production is falling back to localhost. This means DATABASE_URL is missing in Vercel.");
    }

    if (!dbUrl) {
        diagnostics.recommendations.push("DATABASE_URL is not set. Check Vercel Dashboard -> Settings -> Environment Variables.");
    }

    // Test DB connection
    try {
        await db.$queryRaw`SELECT 1`;
        diagnostics.database.connection_test = "SUCCESS";
    } catch (e: any) {
        diagnostics.database.connection_test = `FAILED: ${e.message}`;
        diagnostics.recommendations.push("Database connection failed. Ensure your Neon DB is active and allowing connections from your Vercel IP range.");
    }

    return NextResponse.json(diagnostics, {
        headers: { "Cache-Control": "no-store" }
    });
}
