const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const parser = acorn.Parser.extend(jsx());
const code = fs.readFileSync('src/app/product/[id]/page.tsx', 'utf8');
try {
  parser.parse(code, { ecmaVersion: 2020, sourceType: 'module' });
  console.log('Parsed successfully!');
} catch (e) {
  console.error(e.message, 'at line', e.loc.line, 'column', e.loc.column);
}
