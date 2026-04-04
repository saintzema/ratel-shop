import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEED_PRODUCTS, SEED_SELLERS } from "@/lib/data";

export async function GET() {
  const baseUrl = "https://fairprice.ng";

  function slugify(text: string) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
  }
  const sitemapEntries: { url: string; lastModified: Date; changeFrequency: string; priority: number }[] = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sitemap`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  // 1. Fetch Categories dynamically from distinct categories in SEED_PRODUCTS
  const uniqueCategories = Array.from(new Set(SEED_PRODUCTS.map((p) => p.category)));
  uniqueCategories.forEach((cat) => {
    sitemapEntries.push({
      url: `${baseUrl}/category/${encodeURIComponent(cat)}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // 2. Fetch Products
  let dbProducts: { id: string; updatedAt: Date }[] = [];
  try {
    dbProducts = await db.product.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    });
  } catch (error) {
    console.warn("Failed to fetch products from DB for sitemap. Using strictly seeded data.");
  }

  const productMap = new Map<string, { id: string; lastUpdated: Date }>();
  
  SEED_PRODUCTS.forEach((p) => {
    productMap.set(p.id, { id: p.id, lastUpdated: new Date() });
  });
  
  dbProducts.forEach((p) => {
    productMap.set(p.id, { id: p.id, lastUpdated: p.updatedAt });
  });

  Array.from(productMap.values()).forEach((p) => {
    sitemapEntries.push({
      url: `${baseUrl}/product/${p.id}`,
      lastModified: p.lastUpdated,
      changeFrequency: "daily",
      priority: 0.9,
    });
  });

  // 2.5. Programmatic Price Check Pages (SEO Landing)
  const uniqueProductNames = Array.from(new Set(Array.from(productMap.keys()).map(id => {
      const p = SEED_PRODUCTS.find(sp => sp.id === id);
      return p ? p.name : id;
  })));

  uniqueProductNames.forEach(name => {
      sitemapEntries.push({
          url: `${baseUrl}/price-check/${slugify(name)}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.9,
      });
  });

  // 3. Fetch Stores / Sellers
  let dbSellers: { id: string; storeUrl: string | null }[] = [];
  try {
    dbSellers = await db.seller.findMany({
      select: { id: true, storeUrl: true },
    });
  } catch (error) {
    console.warn("Failed to fetch sellers from DB for sitemap. Using strictly seeded data.");
  }

  const sellerMap = new Map<string, string>();
  
  SEED_SELLERS.forEach((s) => {
    sellerMap.set(s.id, s.store_url || s.id);
  });
  
  dbSellers.forEach((s) => {
    sellerMap.set(s.id, s.storeUrl || s.id);
  });

  Array.from(sellerMap.values()).forEach((storeIdentity) => {
    sitemapEntries.push({
      url: `${baseUrl}/store/${storeIdentity}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

    // await db.$disconnect(); // Next.js handles DB connections automatically

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapEntries.map(entry => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>
  `).join('')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
