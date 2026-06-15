import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// Required for Neon serverless WebSocket transport in Node.js / Vercel Functions
neonConfig.webSocketConstructor = ws;

// Pooler URL — used for all serverless/edge queries (HTTP + WebSocket)
const CONNECTION_STRING = process.env.DATABASE_URL;
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient(): PrismaClient {
    if (!CONNECTION_STRING) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }
    // PrismaNeon constructor takes PoolConfig, not a Pool instance
    const adapter = new PrismaNeon({ connectionString: CONNECTION_STRING });
    return new PrismaClient({ adapter } as any);
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
