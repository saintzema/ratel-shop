// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const prisma = new PrismaClient();
const TSV_PATH = "/Users/admin/Downloads/products_2026-04-11_05-33-55.tsv";
const SELLER_ID = "global-partners";
const SELLER_NAME = "Global Stores";

async function main() {
    console.log("🎯 Starting Google Index Synchronization...");
    
    if (!fs.existsSync(TSV_PATH)) {
        console.error(`❌ TSV file not found at ${TSV_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(TSV_PATH, "utf-8");
    const lines = content.split("\n");
    const header = lines[0].split("\t");
    
    // Column Mapping
    // 0: title, 1: id, 2: price, 10: brand, 12: description, 14: google_cat, 16: image_link, 20: size
    
    let processed = 0;
    let created = 0;
    let updated = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split("\t");
        if (cols.length < 2) continue;

        const title = cols[0]?.replace(/^"|"$/g, '').trim();
        const id = cols[1]?.trim();
        const rawPrice = cols[2]?.trim();
        const brand = cols[10]?.trim();
        const description = cols[12]?.replace(/^"|"$/g, '').trim();
        const googleCat = cols[14]?.trim();
        const imageLink = cols[16]?.trim();
        const size = cols[20]?.trim();

        if (!id || !title) continue;

        // Parse Price: "65000.00 NGN" -> 65000
        const price = parseFloat(rawPrice.replace(/[^\d.]/g, '')) || 0;

        // Extract raw image URL from proxy if possible
        let imageUrl = "";
        if (imageLink.includes("url=")) {
            const urlParam = imageLink.split("url=")[1];
            imageUrl = decodeURIComponent(urlParam.split("&")[0]);
        } else {
            imageUrl = imageLink;
        }

        // Map Category
        let category = "electronics";
        const catLower = googleCat.toLowerCase();
        if (catLower.includes("home") || catLower.includes("appliance")) category = "home";
        else if (catLower.includes("apparel") || catLower.includes("fashion") || catLower.includes("clothing")) category = "fashion";
        else if (catLower.includes("phone")) category = "phones";
        else if (catLower.includes("computer") || catLower.includes("laptop")) category = "electronics";
        else if (catLower.includes("beauty") || catLower.includes("health")) category = "health";

        const specs: any = {};
        if (brand && brand !== "Generic") specs.Brand = brand;
        if (size) specs.Size = size;

        try {
            const existing = await prisma.product.findUnique({ where: { id } });
            
            if (existing) {
                await prisma.product.update({
                    where: { id },
                    data: {
                        name: title,
                        description: description || existing.description,
                        price: price || existing.price,
                        category,
                        imageUrl: imageUrl || existing.imageUrl,
                        sellerId: SELLER_ID,
                        sellerName: SELLER_NAME,
                        specs: { ... (existing.specs as any || {}), ...specs }
                    }
                });
                updated++;
            } else {
                await prisma.product.create({
                    data: {
                        id,
                        name: title,
                        description: description || "Verified product for FairPrice Nigeria.",
                        price,
                        category,
                        imageUrl: imageUrl || "https://fairprice.ng/assets/images/placeholder.png",
                        sellerId: SELLER_ID,
                        sellerName: SELLER_NAME,
                        isActive: true,
                        stock: 50,
                        specs
                    }
                });
                created++;
            }
            processed++;
            if (processed % 50 === 0) console.log(`🔄 Processed ${processed} products...`);
        } catch (e) {
            console.error(`❌ Failed to sync product ${id}:`, e);
        }
    }

    console.log(`\n✨ Sync Complete!`);
    console.log(`✅ Total Processed: ${processed}`);
    console.log(`🆕 New Products: ${created}`);
    console.log(`🆙 Updated Products: ${updated}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
