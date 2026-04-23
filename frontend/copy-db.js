const { PrismaClient } = require('@prisma/client');

// Temporarily disable SSL for local connection
const PROD_URL = "postgresql://neondb_owner:npg_OETt9q4xyHKv@ep-shiny-glade-abtv1ysp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";
const LOCAL_URL = "postgresql://postgres@localhost:5432/fair_price_ng";

async function copyData() {
  const prodDb = new PrismaClient({
    datasources: { db: { url: PROD_URL } }
  });
  
  const localDb = new PrismaClient({
    datasources: { db: { url: LOCAL_URL } }
  });

  try {
    console.log("Testing production DB connection...");
    await prodDb.$queryRaw`SELECT 1`;
    console.log("✅ Production DB connected");
    
    console.log("Testing local DB connection...");
    await localDb.$queryRaw`SELECT 1`;
    console.log("✅ Local DB connected");
    
    // Copy products
    const products = await prodDb.product.findMany({ take: 500 });
    console.log(`\nFound ${products.length} products in production`);
    
    if (products.length > 0) {
      for (const product of products) {
        await localDb.product.upsert({
          where: { id: product.id },
          update: product,
          create: product,
        });
      }
      console.log(`✅ Inserted ${products.length} products`);
    }
    
    // Copy users
    const users = await prodDb.user.findMany({ take: 100 });
    console.log(`\nFound ${users.length} users in production`);
    
    if (users.length > 0) {
      for (const user of users) {
        await localDb.user.upsert({
          where: { id: user.id },
          update: user,
          create: user,
        });
      }
      console.log(`✅ Inserted ${users.length} users`);
    }
    
    // Copy sellers
    const sellers = await prodDb.seller.findMany({ take: 100 });
    console.log(`\nFound ${sellers.length} sellers in production`);
    
    if (sellers.length > 0) {
      for (const seller of sellers) {
        await localDb.seller.upsert({
          where: { id: seller.id },
          update: seller,
          create: seller,
        });
      }
      console.log(`✅ Inserted ${sellers.length} sellers`);
    }
    
    console.log("\n✅ Database copy completed!");
    
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  } finally {
    await prodDb.$disconnect();
    await localDb.$disconnect();
  }
}

copyData();
