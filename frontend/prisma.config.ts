import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

// Load .env.local to match Next.js behavior, then fallback to .env
config({ path: resolve(process.cwd(), ".env.local") });
config(); 

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx ./prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
