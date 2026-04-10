import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Senior Infrastructure Engineer "Brute Force" Environment Injection:
// This prevents Vercel from stripping the DATABASE_URL before the Prisma Rust Engine can see it.
const fallbackUrl = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "undefined") {
    process.env.DATABASE_URL = fallbackUrl;
}

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    const urlWithTimeout = process.env.DATABASE_URL + '&statement_timeout=15000';

    const pool = new NeonPool({ connectionString: urlWithTimeout });

    pool.on('error', (err: Error) => {
        console.warn('Neon pool error:', err.message);
    });

    const adapter = new PrismaNeon(pool as any);
    
    // Explicitly initializing with adapter to satisfy the Neon requirements
    return new PrismaClient({ 
        adapter,
        log: ["error", "warn"] 
    });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
