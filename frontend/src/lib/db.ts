// 1. Initialize environment FIRST to defeat hoisting
import "./env-init";

import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { WebSocket } from "ws";

// WebSocket polyfill for Neon serverless in Node.js environments
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = WebSocket as any;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL!;
    
    // Determine target URL for the Neon Pool
    const urlWithTimeout = dbUrl.includes('?') 
        ? `${dbUrl}&statement_timeout=15000` 
        : `${dbUrl}?statement_timeout=15000`;

    // Initialize Neon Serverless Pool
    const pool = new NeonPool({ connectionString: urlWithTimeout });
    pool.on('error', (err: Error) => {
        console.warn('Neon pool error:', err.message);
    });

    // Configure Neon adapter
    const adapter = new PrismaNeon(pool as any);
    
    // THE DEFINITIVE FIX: Use only the 'adapter' in the constructor
    // Prisma 7 with an adapter is often mutually exclusive with other datasource overrides.
    return new PrismaClient({ 
        adapter,
        log: ["error", "warn"] 
    });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
