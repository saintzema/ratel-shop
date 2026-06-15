import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import ws from "ws";

const CONNECTION_STRING = process.env.DATABASE_URL;

// 1. Setup for Neon Serverless
if (typeof window === "undefined") {
    const isLocal = CONNECTION_STRING?.includes("localhost") || CONNECTION_STRING?.includes("127.0.0.1");
    if (!isLocal && !neonConfig.webSocketConstructor) {
        neonConfig.webSocketConstructor = ws;
    }
}

// 2. Define the singleton container
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 3. The client creator function
function createClient(): PrismaClient {
  if (!CONNECTION_STRING) {
    return new PrismaClient();
  }

  // If connecting to a local DB, use the standard PG adapter
  // Pass PoolConfig object directly to avoid type mismatch between @types/pg and adapter's bundled types
  if (CONNECTION_STRING.includes('localhost') || CONNECTION_STRING.includes('127.0.0.1')) {
    const adapter = new PrismaPg({ connectionString: CONNECTION_STRING });
    return new PrismaClient({ adapter });
  }
  
  const adapter = new PrismaNeon({ connectionString: CONNECTION_STRING });
  return new PrismaClient({ adapter });
}

// 4. Export as 'prisma' so your current imports don't break
export const prisma = globalForPrisma.prisma ?? createClient();

// 5. Save to global object in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 6. Also allow 'default' import if you use: import prisma from '@/lib/prisma'
export default prisma;