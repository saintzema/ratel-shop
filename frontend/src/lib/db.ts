import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma_v2: PrismaClient | undefined };

function createPrismaClient() {
    const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        max: 5, // Neon Free tier strict limit (15 max global)
        idleTimeoutMillis: 30000, // Kill idle sockets gracefully before Neon proxy drops them
        connectionTimeoutMillis: 5000, // Fail fast instead of hanging queries for 30+ seconds
    });

    // Silently absorb idle connection drop exceptions instead of crashing Node.js
    pool.on('error', (err) => {
        console.warn('Neon DB Pool connection silently closed:', err.message);
    });

    const adapter = new PrismaPg(pool as any);
    return new PrismaClient({ adapter, log: ["error", "warn"] });
}

export const db = globalForPrisma.prisma_v2 ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma_v2 = db;
