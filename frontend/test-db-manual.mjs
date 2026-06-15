// import { PrismaClient } from '@prisma/client';
import prisma from './lib/prisma';

// const prisma = new PrismaClient();
async function main() {
  try {
    const count = await prisma.user.count();
    console.log('Connection Successful. User count:', count);
    process.exit(0);
  } catch (e) {
    console.error('DB Connection Failed:', e);
    process.exit(1);
  }
}
main();
