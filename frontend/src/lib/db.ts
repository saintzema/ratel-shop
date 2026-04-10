import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// WebSocket polyfill for Neon serverless in Node.js environments
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

/**
 * PRISMA 6.5.0 STABILIZATION
 * Reverting to the standard singleton pattern for Version 6.5.0.
 * This version handles environment variable validation much better
 * than the 7.x branch in serverless workers.
 */

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
    // The connection string is read from DATABASE_URL.
    // In Vercel, this will be your manual Pooled connection.
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
    
    // Standard Prisma Client initialization for v6.5.0
    return new PrismaClient({ 
        adapter,
        log: ["error", "warn"] 
    });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
