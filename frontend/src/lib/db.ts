import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// WebSocket polyfill for Neon serverless in Node.js environments
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Creates a real instance of the PrismaClient.
 * This should only be called by the Proxy on first access.
 */
function createPrismaClient(): PrismaClient {
    // Standard Neon/Vercel connection resolution
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
    return new PrismaClient({ 
        adapter,
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
