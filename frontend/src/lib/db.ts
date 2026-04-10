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
    // AGGRESSIVE HARDENING: 
    // Vercel sometimes injects an empty "" or "undefined" string for DATABASE_URL during 
    // the static generation phase. We ignore anything that doesn't start with "postgres".
    const rawUrl = process.env.DATABASE_URL;
    const dbUrl = (rawUrl && rawUrl.startsWith("postgres")) 
        ? rawUrl 
        : "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";
    
    // Explicitly inject into process.env to satisfy any internal engine checks
    process.env.DATABASE_URL = dbUrl;

    // Add statement timeout for serverless reliability
    const urlWithTimeout = `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}statement_timeout=15000`;

    // Initialize Neon Serverless Pool
    const pool = new NeonPool({ connectionString: urlWithTimeout });
    pool.on('error', (err: Error) => {
        console.warn('Neon pool error:', err.message);
    });

    // Configure Neon adapter
    const adapter = new PrismaNeon(pool as any);
    
    // Initialize Prisma Client with the Neon adapter and the new Rust-free engine
    return new PrismaClient({ 
        adapter,
        log: ["error", "warn"] 
    });
}

// ─── LAZY PROXY IMPLEMENTATION ───
// This is the definitive fix for Vercel build-time errors.
// It ensures the Prisma engine NEVER starts during 'next build'.

let _internalDb: PrismaClient | undefined;

/**
 * The 'db' export is now a Proxy.
 * It behaves exactly like a PrismaClient, but only calls 'createPrismaClient()'
 * the very first time someone attempts to access a property (like db.user).
 */
export const db = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    // Skip if it's a known symbol or part of the module system
    if (prop === '$$typeof' || prop === 'constructor' || typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
    }
    
    // Initialize on first real property access
    if (!_internalDb) {
      // Check for cached instance in development/HMR
      if (globalForPrisma.prisma) {
        _internalDb = globalForPrisma.prisma;
      } else {
        _internalDb = createPrismaClient();
        if (process.env.NODE_ENV !== "production") {
            globalForPrisma.prisma = _internalDb;
        }
      }
    }
    
    const value = Reflect.get(_internalDb!, prop, receiver);
    // Bind functions to the real client instance
    return typeof value === 'function' ? value.bind(_internalDb) : value;
  }
});
