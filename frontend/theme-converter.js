const fs = require('fs');
const path = require('path');

const targetDirs = [
    'src/app/page.tsx',
    'src/app/product',
    'src/app/search',
    'src/app/cart',
    'src/app/account',
    'src/components/layout',
    'src/components/product',
    'src/components/modals',
];

const walkSync = (dir, filelist = []) => {
    if (!fs.existsSync(dir)) return filelist;
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
        if (dir.endsWith('.tsx') && !dir.includes('checkout')) {
            filelist.push(dir);
        }
        return filelist;
    }
    fs.readdirSync(dir).forEach(file => {
        filelist = walkSync(path.join(dir, file), filelist);
    });
    return filelist;
};

let files = [];
targetDirs.forEach(dir => {
    files = walkSync(dir, files);
});

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Backgrounds
    content = content.replace(/bg-\[#0a0a0a\]/g, 'bg-gray-50');
    content = content.replace(/bg-\[#111\]/g, 'bg-white');
    content = content.replace(/bg-white\/5(?!0)/g, 'bg-white shadow-sm');
    content = content.replace(/bg-white\/10/g, 'bg-gray-100');
    content = content.replace(/bg-white\/20/g, 'bg-gray-200');

    // Borders & Dividers
    content = content.replace(/border-white\/10/g, 'border-gray-200');
    content = content.replace(/border-white\/20/g, 'border-gray-300');
    content = content.replace(/border-white\/5(?!0)/g, 'border-gray-100');
    content = content.replace(/divide-white\/10/g, 'divide-gray-200');
    content = content.replace(/divide-white\/5(?!0)/g, 'divide-gray-100');

    // Muted text
    content = content.replace(/text-white\/80/g, 'text-gray-700');
    content = content.replace(/text-white\/60/g, 'text-gray-500');
    content = content.replace(/text-white\/50/g, 'text-gray-500');
    content = content.replace(/text-white\/40/g, 'text-gray-400');
    content = content.replace(/text-white\/30/g, 'text-gray-300');
    content = content.replace(/text-white\/20/g, 'text-gray-300');
    content = content.replace(/text-white\/10/g, 'text-gray-200');

    // Text: Only replace text-white if it's likely a primary text color (not inside a solid colored button)
    // We can do this by finding classNames and changing text-white to text-gray-900 UNLESS we see a solid background
    // A simpler heuristic: Just replace all text-white, BUT then fix the buttons/badges.
    // Let's replace text-white -> text-gray-900
    content = content.replace(/\btext-white\b/g, 'text-gray-900');

    // Fix buttons that SHOULD have white text
    content = content.replace(/bg-ratel-green-600([^>]*?)text-gray-900/g, 'bg-ratel-green-600$1text-white');
    content = content.replace(/bg-black([^>]*?)text-gray-900/g, 'bg-black$1text-white');
    content = content.replace(/bg-ratel-orange([^>]*?)text-gray-900/g, 'bg-ratel-orange$1text-white');
    content = content.replace(/bg-emerald-500([^>]*?)text-gray-900/g, 'bg-emerald-500$1text-white');
    content = content.replace(/bg-emerald-600([^>]*?)text-gray-900/g, 'bg-emerald-600$1text-white');
    content = content.replace(/text-gray-900([^>]*?)bg-ratel-green-600/g, 'text-white$1bg-ratel-green-600');
    content = content.replace(/text-gray-900([^>]*?)bg-black/g, 'text-white$1bg-black');
    content = content.replace(/text-gray-900([^>]*?)bg-ratel-orange/g, 'text-white$1bg-ratel-orange');

    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
    }
});
console.log('Done');
