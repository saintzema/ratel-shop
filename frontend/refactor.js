const fs = require('fs');
const path = require('path');

const directory = '/Users/admin/Projects/RatelShop/frontend/src';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else {
            if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walkDir(directory);
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/DemoStore/g, 'DataSyncService');
    content = content.replace(/demo-store/g, 'sync-store');
    content = content.replace(/DEMO_SELLERS/g, 'SEED_SELLERS');
    content = content.replace(/DEMO_PRODUCTS/g, 'SEED_PRODUCTS');
    content = content.replace(/DEMO_DEALS/g, 'SEED_DEALS');
    content = content.replace(/demo-store-update/g, 'data-sync-update');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
});

console.log(`Replaced text in ${count} files.`);

const oldCoreFile = path.join(directory, 'lib', 'demo-store.ts');
const newCoreFile = path.join(directory, 'lib', 'sync-store.ts');
if (fs.existsSync(oldCoreFile)) {
    fs.renameSync(oldCoreFile, newCoreFile);
    console.log(`Renamed demo-store.ts to sync-store.ts`);
}
