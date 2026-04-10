import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as ws from "ws";

// Definitive Source of Truth for Database Connection
const NEON_POOLER_URL = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

// Select the best URL available
const ACTIVE_DATABASE_URL = (process.env.DATABASE_URL && process.env.DATABASE_URL !== "undefined")
    ? process.env.DATABASE_URL
    : NEON_POOLER_URL;

// WebSocket polyfill for Neon serverless in Node.js environments
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    // Determine target URL for the Neon Pool
    const urlWithTimeout = ACTIVE_DATABASE_URL.includes('?') 
        ? `${ACTIVE_DATABASE_URL}&statement_timeout=15000` 
        : `${ACTIVE_DATABASE_URL}?statement_timeout=15000`;

    // Initialize Neon Serverless Pool
    const pool = new NeonPool({ connectionString: urlWithTimeout });
    pool.on('error', (err: Error) => {
        console.warn('Neon pool error:', err.message);
    });

    // Configure Neon adapter
    const adapter = new PrismaNeon(pool as any);
    
    // THE NUCLEAR FIX: Direct constructor injection
    // This forces Prisma to use the specific URL regardless of the environment's state.
    // It is the most robust way to handle Vercel's environment stripping.
    return new PrismaClient({ 
        adapter,
        datasources: {
            db: {
                url: ACTIVE_DATABASE_URL
            }
        },
        log: ["error", "warn"] 
    } as any);
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
