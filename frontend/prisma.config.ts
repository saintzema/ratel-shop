import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

// Force load local environments
config({ path: resolve(process.cwd(), ".env.local") });
config(); 

const fallbackDirectUrl = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp.eu-west-2.aws.neon.tech/neondb?sslmode=require";

// In Prisma 7, the 'url' field in prisma.config.ts is used by the CLI (generate, db push, migrate).
// For stable CLI operations with poolers (like Neon), this MUST point to the unpooled (direct) URL.
const DATABASE_URL_UNPOOLED = (process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL_UNPOOLED !== "undefined")
    ? process.env.DATABASE_URL_UNPOOLED
    : fallbackDirectUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx ./prisma/seed.ts",
  },
  datasource: {
    url: DATABASE_URL_UNPOOLED,
  },
});
