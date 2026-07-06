import fs from 'fs';
const content = fs.readFileSync('src/routes/hotel-admin.tsx', 'utf8');
let braceDepth = 0;
let parenDepth = 0;
let bracketDepth = 0;
let lineNum = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let char of line) {
    if (char === '{') braceDepth++;
    if (char === '}') braceDepth--;
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
  }
  if (braceDepth < 0 || parenDepth < 0 || bracketDepth < 0) {
    console.log('Negative depth at line', i+1, ': brace', braceDepth, 'paren', parenDepth, 'bracket', bracketDepth);
    console.log(line);
    break;
  }
}
console.log('Final depths - brace:', braceDepth, 'paren:', parenDepth, 'bracket:', bracketDepth);
