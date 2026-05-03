import { defineConfig } from '@prisma/config';

export default defineConfig({
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DATABASE_URL_UNPOOLED,
  },
});
