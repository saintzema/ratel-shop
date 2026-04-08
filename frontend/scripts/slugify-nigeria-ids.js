/**
 * slugify-nigeria-ids.js
 * 
 * Converts all "nj_pN" product IDs in demo-data-nigeria.ts to SEO-friendly slugs.
 * 
 * Usage: /usr/local/bin/node scripts/slugify-nigeria-ids.js
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'src', 'lib', 'demo-data-nigeria.ts');

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

const idToSlug = {};
const seenSlugs = new Set();

const lines = content.split('\n');
let currentId = null;

for (const line of lines) {
    const idMatch = line.match(/id:\s*"(nj_p\d+)"/);
    if (idMatch) {
        currentId = idMatch[1];
    }
    
    if (currentId) {
        const nameMatch = line.match(/(?<![_])name:\s*["'`]([^"'`]+)["'`]/);
        const sellerNameMatch = line.match(/seller_name:/);
        
        if (nameMatch && !sellerNameMatch) {
            const name = nameMatch[1];
            let slug = slugify(name);
            
            let finalSlug = slug;
            let counter = 2;
            while (seenSlugs.has(finalSlug)) {
                finalSlug = `${slug}-${counter}`;
                counter++;
            }
            seenSlugs.add(finalSlug);
            idToSlug[currentId] = finalSlug;
            currentId = null;
        }
    }
}

console.log(`Found ${Object.keys(idToSlug).length} Nigeria product IDs to convert.`);
console.log('Sample mappings:');
Object.entries(idToSlug).slice(0, 10).forEach(([old, slug]) => {
    console.log(`  ${old} -> ${slug}`);
});

// Sort by ID length descending to prevent partial matches
const sortedEntries = Object.entries(idToSlug).sort((a, b) => b[0].length - a[0].length);

for (const [oldId, newSlug] of sortedEntries) {
    content = content.replace(
        new RegExp(`id: "${oldId}"`, 'g'),
        `id: "${newSlug}"`
    );
    content = content.replace(
        new RegExp(`product_id: "${oldId}"`, 'g'),
        `product_id: "${newSlug}"`
    );
}

fs.writeFileSync(DATA_FILE, content, 'utf8');
console.log(`\n✅ Successfully updated ${DATA_FILE}`);
console.log(`   Total IDs converted: ${Object.keys(idToSlug).length}`);
