/**
 * slugify-ids.js
 * 
 * Programmatically replaces all "pN" product IDs in data.ts
 * with SEO-friendly slugs derived from each product's `name` field.
 * Also updates all cross-references (reviews, deals, orders, price alerts).
 * 
 * Usage: /usr/local/bin/node scripts/slugify-ids.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'src', 'lib', 'data.ts');

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[''"]/g, '')
        .replace(/[—–]/g, '-')
        .replace(/\+/g, 'plus')
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
}

let content = fs.readFileSync(DATA_FILE, 'utf8');

// Build the mapping using two formats found in data.ts:
// Format A (expanded): id: "pN",\n        seller_id: ...\n        seller_name: ...\n        name: "Product Name",
// Format B (compact):  id: "pN", seller_id: "s1", seller_name: "...",\n        name: "Product Name",
const idToSlug = {};
const seenSlugs = new Set();

// Match: id: "pN" ... followed eventually by a standalone `name:` (not seller_name)
// We use a line-by-line approach for accuracy
const lines = content.split('\n');
let currentId = null;

for (const line of lines) {
    // Match product id declarations
    const idMatch = line.match(/id:\s*"(p\d+)"/);
    if (idMatch) {
        currentId = idMatch[1];
    }
    
    // Match the product name (NOT seller_name)
    // The actual product name field starts with just `name:` not `seller_name:`
    if (currentId) {
        const nameMatch = line.match(/(?<![_])name:\s*["'`]([^"'`]+)["'`]/);
        const sellerNameMatch = line.match(/seller_name:/);
        
        if (nameMatch && !sellerNameMatch) {
            const name = nameMatch[1];
            let slug = slugify(name);
            
            // Handle duplicates
            let finalSlug = slug;
            let counter = 2;
            while (seenSlugs.has(finalSlug)) {
                finalSlug = `${slug}-${counter}`;
                counter++;
            }
            seenSlugs.add(finalSlug);
            idToSlug[currentId] = finalSlug;
            currentId = null; // Reset after finding the name
        }
    }
}

console.log(`Found ${Object.keys(idToSlug).length} product IDs to convert.`);
console.log('Sample mappings:');
Object.entries(idToSlug).slice(0, 15).forEach(([old, slug]) => {
    console.log(`  ${old} -> ${slug}`);
});

// Replace all occurrences of old IDs with new slugs
// Sort by ID length descending to prevent p1 matching inside p10, p100 etc.
const sortedEntries = Object.entries(idToSlug).sort((a, b) => b[0].length - a[0].length);

for (const [oldId, newSlug] of sortedEntries) {
    // Replace id: "pN"
    content = content.replace(
        new RegExp(`id: "${oldId}"`, 'g'),
        `id: "${newSlug}"`
    );
    
    // Replace product_id: "pN" (reviews, deals, orders, alerts)
    content = content.replace(
        new RegExp(`product_id: "${oldId}"`, 'g'),
        `product_id: "${newSlug}"`
    );
}

// Write back
fs.writeFileSync(DATA_FILE, content, 'utf8');
console.log(`\n✅ Successfully updated ${DATA_FILE}`);
console.log(`   Total IDs converted: ${Object.keys(idToSlug).length}`);
