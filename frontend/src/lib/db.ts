import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Set up Neon serverless to use WebSockets
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Check if DATABASE_URL is properly configured.
 * This is the FIRST line of defense against silent failures —
 * without this, Prisma+Neon logs an error but returns null/empty
 * instead of throwing, causing API routes to return 200 OK with no data.
 */
export const isDatabaseConfigured = (() => {
    const url = process.env.DATABASE_URL;
    return !!url && url.length > 10 && url.startsWith("postgres");
})();

function createPrismaClient() {
    if (!isDatabaseConfigured) {
        // Throw immediately so API route catch blocks fire and return 503
        throw new Error(
            "DATABASE_URL is not configured or invalid. " +
            "Set it in the Vercel Dashboard → Settings → Environment Variables, " +
            "then redeploy. Current value: " + (process.env.DATABASE_URL ? `"${process.env.DATABASE_URL.substring(0, 20)}..."` : "undefined")
        );
    }

    // Determine the connection string with a safe timeout
    const connectionString = process.env.DATABASE_URL!;
    const urlWithTimeout = connectionString + (connectionString.includes('?') ? '&' : '?') + 'statement_timeout=15000';

    // Use Neon Serverless Pool (highly resilient for Vercel/Serverless)
    const pool = new NeonPool({ 
        connectionString: urlWithTimeout,
    });

    pool.on('error', (err: Error) => {
        console.warn('Neon connection pool error:', err.message);
    });

    // Cast pool to any to bypass version mismatch in @neondatabase/serverless vs @prisma/adapter-neon types
    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({ adapter, log: ["error", "warn"] });
}

/**
 * Create the Prisma client, or a throwing proxy if DATABASE_URL is missing.
 * The proxy ensures that ANY db.xxx.yyy() call throws an error that gets
 * caught by API route catch blocks, which then return 503 to the frontend.
 * Without this, Prisma silently returns null/[] with 200 OK status.
 */
let dbInstance: PrismaClient;
try {
    dbInstance = globalForPrisma.prisma ?? createPrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = dbInstance;
} catch (e: any) {
    console.error("⚠️ DATABASE NOT CONFIGURED:", e.message);
    // Create a proxy that throws on ANY property access (db.user, db.product, etc.)
    // This forces all API route catch blocks to fire → return 503 → frontend triggers fallback
    const handler: ProxyHandler<object> = {
        get(_target, prop) {
            // Allow toString/Symbol access for logging
            if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') return undefined;
            // Return another proxy for chained access like db.user.findMany()
            return new Proxy(() => {}, {
                get() {
                    return () => { throw new Error(`Database not configured: ${String(prop)} is unavailable. Set DATABASE_URL and redeploy.`); };
                },
                apply() {
                    throw new Error(`Database not configured: ${String(prop)} is unavailable. Set DATABASE_URL and redeploy.`);
                }
            });
        }
    };
    dbInstance = new Proxy({}, handler) as unknown as PrismaClient;
}

export const db = dbInstance;
