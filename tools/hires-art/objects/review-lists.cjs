const fs = require('fs');
const path = require('path');
const spec = JSON.parse(fs.readFileSync('tools/hires-art/objects/items.json'));
const rows = [];
const missing = [];
for (const item of spec.items) {
  if (item.derive) continue;
  for (const output of item.outputs) {
    const key = [].concat(output.key)[0];
    const file = path.resolve('public/assets/hires/pixelhack-hd', key + '.png');
    if (fs.existsSync(file) && fs.readFileSync(file).readUInt32BE(16) === 256) {
      rows.push({ name: key.slice(4), path: file });
    } else missing.push(key);
  }
}
fs.writeFileSync('.hires-tmp/objects/review-list.json', JSON.stringify(rows));
console.log(JSON.stringify({ available: rows.length, missing: missing.length }));
