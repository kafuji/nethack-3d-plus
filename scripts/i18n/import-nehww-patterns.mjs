// Extract a conservative, bounded subset of the pinned Nehww regex dictionary.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const bytes = readFileSync(process.argv[2]);
if (createHash("sha256").update(bytes).digest("hex") !== "973650880dfbf16871b572855a23d385a0794043ed7c414317544b1d0c3d709c") throw new Error("Unexpected source revision");
const rows = [];
let row = [], field = "", quoted = false;
const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  if (quoted) {
    if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
    else if (ch === '"') quoted = false;
    else field += ch;
  } else if (ch === '"' && field === "") quoted = true;
  else if (ch === ",") { row.push(field); field = ""; }
  else if (ch === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
  else field += ch;
}
if (quoted) throw new Error("Unclosed CSV field");
if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
if (rows[0]?.slice(0, 3).join(",") !== "Group,Source,Translation") throw new Error("Unexpected CSV header");

const grouped = new Map();
for (const [group, source, translation] of rows.slice(1)) {
  if (group !== "Pattern" || !source || !translation) continue;
  const variants = grouped.get(source) ?? new Set();
  variants.add(translation);
  grouped.set(source, variants);
}
const accepted = [];
const knownBad = new Set([
  "^Your (.*) catches light!$", // catches fire, not reflects light
  "^(.*) is destroyed!$", // do not attribute the destruction to the player
  "^(.*) pretends to be friendly to (.*)\\.$", // the pretense is important
  "^(.*) wields a broad (.*)!$", // broad sword is a weapon type
  "^The broad (.*) welds itself to the (.*)'s hand!$",
  "^(.*) disarms your (.*)\\.$",
]);
for (const [source, variants] of grouped) {
  if (variants.size !== 1 || knownBad.has(source)) continue;
  const rawTranslation = [...variants][0];
  const upstreamTodo = /^=== TODO ===\s*/.test(rawTranslation);
  const translation = rawTranslation.replace(/^=== TODO ===\s*/, "");
  if (!source.startsWith("^") || !source.endsWith("$") || /[\x00-\x1f\x7f]/.test(source + translation)) continue;
  if (/(?:===|TODO|FIXME|TBD)/i.test(source + translation) || !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(translation)) continue;
  // Only literal text and up to two explicitly substituted wildcard captures.
  const parts = [];
  let literal = "", count = 0, valid = true;
  const body = source.slice(1, -1);
  // TODO-marked fragments often omit the next line and are especially
  // unreliable. Accept only sentence-shaped candidates, still as references.
  if (upstreamTodo && (!/^[A-Z]/.test(body) || !/[.!?]$/.test(body))) continue;
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith("(.*)", i)) {
      parts.push(literal); literal = ""; count++; i += 3;
    } else if (body[i] === "\\") {
      const escaped = body[++i];
      if (!escaped || !".?!()[]{}\\\"'".includes(escaped)) { valid = false; break; }
      literal += escaped;
    } else if (".*+?()[]{}|^$".includes(body[i])) { valid = false; break; }
    else literal += body[i];
  }
  parts.push(literal);
  if (!valid || count < 1 || count > 2 || parts.join("").length < 12) continue;
  if (parts.some((part, i) => i > 0 && i < parts.length - 1 && part.length < 2)) continue;
  if (/[\[\]{}%`]/.test(parts.join("")) || /\b(?:ctrl|alt|shift|escape|esc|key|keys|press|type|command)\b/i.test(parts.join(""))) continue;
  const references = [...translation.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  if (references.length !== count || references.some((n) => n < 1 || n > count) || new Set(references).size !== count) continue;
  if (/\b(?:no|not|never|nothing|none|without|cannot|can't|won't|don't|doesn't|didn't|isn't|aren't|hasn't|haven't|couldn't|wouldn't|shouldn't)\b/i.test(parts.join(" ")) && !/(?:ない|なく|ません|ませぬ|ず|ぬ|無|未|不|なし|いない|できず|やめ|駄目|ダメ|いいえ|違)/.test(translation)) continue;
  if (/\bidentif\w*/i.test(parts.join(" ")) && !/(?:識別|鑑定|特定|正体)/.test(translation)) continue;
  if (/\d/.test(parts.join("")) || /\d/.test(translation.replace(/\$\d+/g, ""))) continue;
  accepted.push({ parts, translation });
}
writeFileSync("src/i18n/data/nehww-patterns.json", JSON.stringify(accepted, null, 2) + "\n");
console.log(`Accepted ${accepted.length} of ${grouped.size} distinct patterns.`);
