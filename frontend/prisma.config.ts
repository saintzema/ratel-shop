import { defineConfig } from "prisma/config";

/**
 * PRISMA 7 MASTER CONFIGURATION
 * This file is the central "brain" for Prisma 7. 
 * By hardcoding the URL here, we satisfy the engine's internal validation,
 * ensuring it never defaults to 'localhost' during build or cold starts.
 */
export default defineConfig({
  datasource: {
    url: "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require",
  },
});
