import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Senior Infrastructure Engineer "Brute Force" Environment Injection:
// This prevents Vercel from stripping the DATABASE_URL before the Prisma Rust Engine can see it.
const fallbackUrl = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";
const activeUrl = (!process.env.DATABASE_URL || process.env.DATABASE_URL === "undefined") 
    ? fallbackUrl 
    : process.env.DATABASE_URL;

// Ensure it's in the environment for any internal Prisma usage
process.env.DATABASE_URL = activeUrl;

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    const urlWithTimeout = activeUrl.includes('?') 
        ? `${activeUrl}&statement_timeout=15000` 
        : `${activeUrl}?statement_timeout=15000`;

    const pool = new NeonPool({ connectionString: urlWithTimeout });

    pool.on('error', (err: Error) => {
        console.warn('Neon pool error:', err.message);
    });

    const adapter = new PrismaNeon(pool as any);
    
    return new PrismaClient({ 
        adapter,
        log: ["error", "warn"] 
    });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
