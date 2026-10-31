const s = require('fs').readFileSync('public/nethack-5.wasm').toString('latin1');
const all = [...new Set(s.match(/[\x20-\x7e]{4,}(?=\x00)/g) ?? [])];
console.log(all.filter(v => /^(?: \(|\(|, | \b)|unpaid|zorkmid/i.test(v)).filter(v => v.length < 80).join('\n'));
