import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// WebSocket polyfill for Neon serverless in Node.js environments
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

// ─── TOTAL SILENCE SHIELD (BUILD-TIME) ───
// Prisma's engine validates the existence of DATABASE_URL on import.
// In Vercel builds, we inject a dummy URL to prevent the 'host: localhost' error log.
if (process.env.NEXT_PHASE === 'phase-production-build' && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy";
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * THE LOOP-BREAKER: 
 * Explicitly injects the connection string into the PrismaClient constructor.
 * This prevents the engine from searching the environment and defaulting to localhost.
 */
function createPrismaClient(): PrismaClient {
    // Definitive production fallback (Hardcoded to break the environment dependency loop)
    const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";
    
    // Add statement timeout for serverless reliability
    const urlWithTimeout = `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}statement_timeout=15000`;

    // Initialize Neon Serverless Pool
    const pool = new NeonPool({ connectionString: urlWithTimeout });
    pool.on('error', (err: Error) => {
        console.warn('Neon pool error:', err.message);
    });

    // Configure Neon adapter
    const adapter = new PrismaNeon(pool as any);
    
    // Standard Prisma Client initialization for stable v6.x
    // WE EXPLICITLY PASS datasourceUrl TO BREAK THE LOOP
    return new PrismaClient({ 
        adapter,
        datasourceUrl: dbUrl,
        log: ["error", "warn"] 
    });
}

// ─── AGGRESSIVE LAZY PROXY (THE FINAL SHIELD) ───
// This prevents 'new PrismaClient()' from being called during 'next build'.
// It only initializes when a query (like db.user.findMany) is actually run.

let _internalDb: PrismaClient | undefined;

export const db = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    // Intercept property access to ensure initialization
    if (!_internalDb) {
      if (globalForPrisma.prisma) {
        _internalDb = globalForPrisma.prisma;
      } else {
        _internalDb = createPrismaClient();
        if (process.env.NODE_ENV !== "production") {
            globalForPrisma.prisma = _internalDb;
        }
      }
    }
    
    // Safety check for symbols or module metadata
    if (prop === '$$typeof' || prop === 'constructor' || typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
    }

    const value = Reflect.get(_internalDb!, prop, receiver);
    
    // Bind functions (like .findMany, .create) to the real client
    return typeof value === 'function' ? value.bind(_internalDb) : value;
  }
});
