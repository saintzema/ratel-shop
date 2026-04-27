import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// 1. Setup for Neon Serverless
if (typeof window === 'undefined') {
    // Only set the websocket constructor if we are actually using Neon serverless
    const isLocal = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1');
    if (!isLocal) {
        neonConfig.webSocketConstructor = ws;
    }
}

const CONNECTION_STRING = process.env.DATABASE_URL;

// 2. Define the singleton container
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 3. The client creator function
function createClient(): PrismaClient {
  // If connecting to a local DB, don't use the Neon Serverless adapter
  if (CONNECTION_STRING?.includes('localhost') || CONNECTION_STRING?.includes('127.0.0.1')) {
    return new PrismaClient();
  }
  const adapter = new PrismaNeon({ connectionString: CONNECTION_STRING! });
  return new PrismaClient({ adapter } as any);
}

// 4. Export as 'prisma' so your current imports don't break
export const prisma = globalForPrisma.prisma ?? createClient();

// 5. Save to global object in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 6. Also allow 'default' import if you use: import prisma from '@/lib/prisma'
export default prisma;