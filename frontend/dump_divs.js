const fs = require('fs');
const content = fs.readFileSync('src/app/product/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
let divDepth = 0;
let mainDepth = 0;
const stack = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Naive tag counting (warning: very simple, but gives a rough idea)
    const openDivs = (line.match(/<div(\s|>)/g) || []).length;
    const closeDivs = (line.match(/<\/div>/g) || []).length;
    const openMain = (line.match(/<main(\s|>)/g) || []).length;
    const closeMain = (line.match(/<\/main>/g) || []).length;

    if (openDivs > 0 || closeDivs > 0 || openMain > 0 || closeMain > 0) {
        if (openMain > 0) { mainDepth++; stack.push({tag: 'main', line: i + 1}); }
        for(let j=0; j<openDivs; j++) { divDepth++; stack.push({tag: 'div', line: i + 1}); }
        
        for(let j=0; j<closeDivs; j++) { 
            divDepth--; 
            let popped = stack.length > 0 ? stack.pop() : null;
            if (popped && popped.tag !== 'div') {
                 console.log(`Mismatch at line ${i+1}: expected </${popped.tag}> but got </div>. Open tag was at ${popped.line}`);
            }
        }
        if (closeMain > 0) { 
            mainDepth--; 
            let popped = stack.length > 0 ? stack.pop() : null;
            if (popped && popped.tag !== 'main') {
                 console.log(`Mismatch at line ${i+1}: expected </${popped.tag}> but got </main>. Open tag was at ${popped.line}`);
            }
        }
    }
}
console.log('Unclosed tags:', stack.map(s => `${s.tag} at ${s.line}`));
