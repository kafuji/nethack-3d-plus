// Import names that are present as literal strings in the bundled 5.0 runtime.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const bytes = readFileSync(process.argv[2]);
if (createHash("sha256").update(bytes).digest("hex") !== "973650880dfbf16871b572855a23d385a0794043ed7c414317544b1d0c3d709c") throw new Error("Unexpected source revision");
const source = bytes.toString("utf8").replace(/^\uFEFF/, "");
const rows = [];
let row = [], field = "", quoted = false;
for (let i = 0; i < source.length; i++) {
  const ch = source[i];
  if (quoted) {
    if (ch === '"' && source[i + 1] === '"') { field += '"'; i++; }
    else if (ch === '"') quoted = false;
    else field += ch;
  } else if (ch === '"' && field === "") quoted = true;
  else if (ch === ",") { row.push(field); field = ""; }
  else if (ch === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
  else field += ch;
}
if (quoted || rows[0]?.slice(0, 3).join(",") !== "Group,Source,Translation") throw new Error("Unexpected CSV");
const wasm = readFileSync("public/nethack-5.wasm");
const grouped = new Map();
const corrections = { "baby red dragon": "赤い幼竜" };
const colors = { red: /赤|レッド/, blue: /青|ブルー/, green: /緑|グリーン/, yellow: /黄|イエロー/, black: /黒|ブラック/, white: /白|ホワイト/, gray: /灰|グレイ|グレー/, silver: /銀|シルバー/, gold: /金|ゴールド/, orange: /橙|オレンジ/, brown: /茶|ブラウン/, purple: /紫|パープル/, violet: /紫|バイオレット|ヴァイオレット/ };
for (const [group, name, rawJapanese] of rows.slice(1)) {
  const japanese = corrections[name] ?? rawJapanese;
  // Capitalized entries include shopkeepers and other proper names, which may
  // coincide with names entered by the player. Keep those unchanged.
  if (group !== "Entity" || !name || !japanese || !/^[a-z][a-z '-]*$/.test(name)) continue;
  if (!wasm.includes(Buffer.from(`${name}\0`, "ascii"))) continue;
  if (!/^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー・＝ 　]+$/u.test(japanese) || /(?:TODO|FIXME|===)/i.test(japanese)) continue;
  if (Object.entries(colors).some(([color, expected]) => new RegExp(`(?:^| )${color}(?: |$)`, "i").test(name) && !expected.test(japanese))) continue;
  const variants = grouped.get(name) ?? new Set();
  variants.add(japanese);
  grouped.set(name, variants);
}
const data = Object.fromEntries([...grouped].filter(([, translations]) => translations.size === 1).map(([name, translations]) => [name, [...translations][0]]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
writeFileSync("src/i18n/data/nehww-entities.json", JSON.stringify(data, null, 2) + "\n");
console.log(`Accepted ${Object.keys(data).length} source names found in the bundled runtime.`);
