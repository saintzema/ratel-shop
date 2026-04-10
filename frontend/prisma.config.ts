import { defineConfig } from "@prisma/config";

// DEFINITIVE HARDENING: We provide a hardcoded fallback to the Neon pooler.
// This ensures that Prisma CLI and the Engine always have a valid host, 
// even if environment variables are delayed during serverless cold starts.
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
