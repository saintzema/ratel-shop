import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Set up Neon serverless to use WebSockets
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    // Determine the connection string with a safe timeout
    const connectionString = process.env.DATABASE_URL || "";
    const urlWithTimeout = connectionString + (connectionString.includes('?') ? '&' : '?') + 'statement_timeout=15000';

    // Use Neon Serverless Pool (highly resilient for Vercel/Serverless)
    const pool = new NeonPool({ 
        connectionString: urlWithTimeout,
    });

    pool.on('error', (err) => {
        console.warn('Neon connection pool error:', err.message);
    });

    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter, log: ["error", "warn"] });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
