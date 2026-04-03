import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function logToFile(msg: string) {
    try {
        fs.appendFileSync(path.join(process.cwd(), "db_debug.log"), `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {}
}

logToFile("DB Module Loaded");

// --- NEON SERVERLESS DB CONFIGURATION (COMMENTED OUT) ---
// If Neon Database is back online and you want to switch to it,
// uncomment the following block and update your DATBASE_URL to the Neon string.
// 
// import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
// import { PrismaNeon } from "@prisma/adapter-neon";
// import ws from "ws";
// neonConfig.webSocketConstructor = ws;
// 
// function createNeonPrismaClient() {
//     const pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
//     const adapter = new PrismaNeon(pool);
//     return new PrismaClient({ adapter, log: ["error", "warn"] });
// }
// ---------------------------------------------------------

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    // Current Local Postgres Configuration
    const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'statement_timeout=15000', // 15s hard query timeout
        max: 10,
        idleTimeoutMillis: 30000, 
        connectionTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
        console.warn('Postgres connection pool error:', err.message);
    });

    logToFile("Creating Prisma Client with Pool Adapter...");
    const adapter = new PrismaPg(pool as any);
    const client = new PrismaClient({ adapter, log: ["error", "warn"] });
    logToFile("Prisma Client Instance Created.");
    return client;
}

// export const db = globalForPrisma.prisma ?? createNeonPrismaClient(); // Use when Neon is enabled
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
