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
 * THE PHANTOM CLIENT (BUILD SHIELD):
 * This function returns a Mock/No-Op Proxy if we are in the 'next build' phase
 * and no database URL is found. This prevents the Prisma Engine (Rust) from 
 * being initialized, which is the only way to stop the 'host: localhost' logs.
 */
function createPhantomClient(): any {
    return new Proxy({}, {
        get: () => {
            // Return a function that does nothing for any property access
            return () => Promise.resolve(null);
        }
    });
}

/**
 * THE LOOP-BREAKER: 
 * Explicitly injects the connection string into the PrismaClient constructor.
 */
function createPrismaClient(): PrismaClient {
    // Definitive production fallback
    const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";
    
    // Initialize Neon Serverless Pool
    const pool = new NeonPool({ connectionString: dbUrl });
    pool.on('error', (err: Error) => {
        console.warn('Neon pool error:', err.message);
    });

    // Configure Neon adapter
    const adapter = new PrismaNeon(pool as any);
    
    // Standard Prisma Client initialization
    return new PrismaClient({ 
        adapter,
        log: ["error", "warn"] 
    });
}

// ─── AGGRESSIVE LAZY PROXY (THE PHANTOM SHIELD) ───
// This prevents 'new PrismaClient()' from being called during 'next build'.

let _internalDb: any | undefined;

export const db = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    // 1. THE PHANTOM CHECK: Completely blind the engine during static generation
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;
    
    if (isBuild) {
        return createPhantomClient()[prop];
    }

    // 2. LAZY INITIALIZATION: Only happens at runtime for real queries
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
    
    if (prop === '$$typeof' || prop === 'constructor' || typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
    }

    const value = Reflect.get(_internalDb!, prop, receiver);
    return typeof value === 'function' ? value.bind(_internalDb) : value;
  }
});
