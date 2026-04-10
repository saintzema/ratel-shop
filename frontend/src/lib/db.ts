import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    const rawUrl = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp.eu-west-2.aws.neon.tech/neondb?sslmode=require";
    const urlWithTimeout = rawUrl + '&statement_timeout=15000';

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
