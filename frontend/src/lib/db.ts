import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Set up Neon serverless to use WebSockets
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    // Try to get standard database URL from Next.js runtime environment.
    // ALWAYS prioritize UNPOOLED connections for @neondatabase/serverless WebSocket driver,
    // otherwise the connection times out against PgBouncer (Vercel 504 Error).
    let connectionString = process.env.DATABASE_URL_UNPOOLED 
        || process.env.DATABASE_POSTGRES_URL_NON_POOLING 
        || process.env.DATABASE_URL 
        || process.env.DATABASE_POSTGRES_PRISMA_URL 
        || process.env.POSTGRES_PRISMA_URL;
    
    // Safety check with explicit console logging to catch silently bad bindings (e.g. on Vercel preview)
    if (!connectionString || connectionString.length < 10) {
        console.warn("⚠️ DATABASE_URL is missing or invalid in this runtime. Defaulting to empty initialization.");
        connectionString = ""; // This will cause subsequent operations to fail locally
    }

    // Neon WebSocket Serverless Driver MUST use direct unpooled endpoint.
    // If the Vercel connection string contains '-pooler', remove it.
    if (connectionString) {
        connectionString = connectionString.replace("-pooler.", ".");
    }

    // Append safe statement timeout for serverless
    const urlWithTimeout = connectionString + (connectionString.includes('?') ? '&' : '?') + 'statement_timeout=15000';

    // Initialize the Neon WebSocket connection pool
    const pool = new NeonPool({ connectionString: urlWithTimeout });

    pool.on('error', (err: Error) => {
        console.warn('Neon connection pool error:', err.message);
    });

    // Create standard Prisma Client passing the Neon Adapter.
    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({ 
        adapter, 
        log: ["error", "warn"] 
    });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
