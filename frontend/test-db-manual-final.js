const { PrismaClient } = require('@prisma/client');
console.log('--- DB TEST START ---');
const prisma = new PrismaClient();
async function main() {
  try {
    const start = Date.now();
    const count = await prisma.user.count();
    console.log('--- SUCCESS ---');
    console.log('User count:', count);
    console.log('Time taken:', Date.now() - start, 'ms');
  } catch (e) {
    console.log('--- FAILED ---');
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
    console.log('--- DISCONNECTED ---');
  }
}
main();
