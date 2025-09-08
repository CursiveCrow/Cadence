const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const from = process.argv[3];
const to = process.argv[4];

if (!file || !from || !to) {
  console.error('Usage: node scripts/replace.js <file> <from> <to>');
  process.exit(1);
}

const p = path.resolve(file);
let txt = fs.readFileSync(p, 'utf8');
const before = txt;
txt = txt.replace(from, to);
if (txt !== before) {
  fs.writeFileSync(p, txt, 'utf8');
  console.log('Replaced in', file);
} else {
  console.log('No change for', file);
}

