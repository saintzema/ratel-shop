import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

// Force load local environments
config({ path: resolve(process.cwd(), ".env.local") });
config(); 

const fallbackUrl = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

// Definitive source of truth for the URL
const DATABASE_URL = (process.env.DATABASE_URL && process.env.DATABASE_URL !== "undefined") 
    ? process.env.DATABASE_URL 
    : fallbackUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx ./prisma/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
