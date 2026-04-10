/**
 * Definitive Environment Initialization (Hoisting-Proof)
 * This file is intended to be imported FIRST in db.ts to ensure
 * that the DATABASE_URL is set before the Prisma Client or any
 * other database-dependent modules are evaluated.
 */

const NEON_POOLER_URL = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

export const initializeEnv = () => {
    // If the database URL is missing (due to Vercel stripping), inject the hardcoded fallback
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "undefined" || process.env.DATABASE_URL.includes("localhost")) {
        process.env.DATABASE_URL = NEON_POOLER_URL;
        console.log("🛡️ Infra: Primed DATABASE_URL from hardcoded fallback.");
    }
};

// Execute immediately upon import to defeat hoisting
initializeEnv();
