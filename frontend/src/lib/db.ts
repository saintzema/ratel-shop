import { PrismaClient } from "@prisma/client";

/**
 * THE NATIVE CLIENT (NUCLEAR VERSION):
 * We have hardcoded the URL directly in schema.prisma.
 * This client is now a direct, native pipe to Neon with NO dependencies 
 * on environment variables, adapters, or proxies.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
