import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// ─── THE IRON SHIELD: FORCE INJECTION ───
// The Prisma Rust engine ONLY looks at process.env. 
// We must hard-set it at the top level to prevent the 'host: localhost' crash.
const PROD_URL = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) {
    process.env.DATABASE_URL = PROD_URL;
}

// WebSocket polyfill for Neon
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * THE REFINED CLIENT GENERATOR:
 * Stable for Prisma 6.5.0 on Vercel.
 */
function createPrismaClient(): PrismaClient {
    const pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
    pool.on('error', (err: Error) => console.warn('Neon pool error:', err.message));
    const adapter = new PrismaNeon(pool as any);
    
    return new PrismaClient({ 
        adapter,
        log: ["error", "warn"] 
    });
}

// ─── THE SMART PROXY (NO PHANTOMS) ───
// We no longer return 'null'. We always ensure a real client is returned,
// using the Iron Shield fallback if necessary.

let _internalDb: PrismaClient | undefined;

export const db = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
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
