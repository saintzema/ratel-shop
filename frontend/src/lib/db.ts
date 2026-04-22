import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// Required for Neon serverless WebSocket transport in Node.js / Vercel Functions
neonConfig.webSocketConstructor = ws;

// Pooler URL — used for all serverless/edge queries (HTTP + WebSocket)
const CONNECTION_STRING =
    process.env.DATABASE_URL ??
    "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=60";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient(): PrismaClient {
    const pool = new Pool({ connectionString: CONNECTION_STRING });
    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({ adapter } as any);
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
