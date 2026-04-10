import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// WebSocket polyfill for Neon serverless in Node.js environments
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    // Definitive source of truth for the URL
    const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";
    
    // Add timeout for serverless reliability
    const urlWithTimeout = `${dbUrl}&statement_timeout=15000`;

    // Initialize Neon Serverless Pool
    const pool = new NeonPool({ connectionString: urlWithTimeout });
    pool.on('error', (err: Error) => {
        console.warn('Neon pool error:', err.message);
    });

    // Configure Neon adapter
    const adapter = new PrismaNeon(pool as any);
    
    // THE DEFINITIVE FIX: Use adapter + explicit datasources for Prisma 7
    // This absolutely ensures Prisma doesn't default to 'localhost'.
    return new PrismaClient({ 
        adapter,
        datasources: {
            db: {
                url: dbUrl
            }
        },
        log: ["error", "warn"] 
    });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
