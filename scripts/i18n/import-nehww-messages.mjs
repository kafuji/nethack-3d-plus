// Rebuild the optional, unreviewed exact-match fallback from the pinned
// Nehww dictionary. Usage: node scripts/i18n/import-nehww-messages.mjs <csv>
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Pass the pinned Nehww dictionary.csv path.");
const bytes = readFileSync(sourcePath);
const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
if (sourceSha256 !== "973650880dfbf16871b572855a23d385a0794043ed7c414317544b1d0c3d709c") {
  throw new Error("The input CSV does not match the pinned Nehww revision.");
}
const source = bytes.toString("utf8").replace(/^\uFEFF/, "");

// RFC 4180-style CSV, including embedded commas, doubled quotes and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ',') { row.push(field); field = ""; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (quoted) throw new Error("Malformed CSV: unterminated quoted field");
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

const rows = parseCsv(source);
if (rows[0]?.slice(0, 3).join(",") !== "Group,Source,Translation") throw new Error("Unexpected CSV header");
const forbidden = new Set([
  // Meaning of identify is omitted in the source's Japanese translation.
  "Do you want your possessions identified?",
]);
const stats = { sourceRows: rows.length - 1, candidateRows: 0, rejected: {}, conflicts: 0, accepted: 0 };
const reject = (reason) => { stats.rejected[reason] = (stats.rejected[reason] ?? 0) + 1; };
const grouped = new Map();
const supportedGroups = new Set(["Message", "Quest", "Achievements", "ItemEffects(効果)", "Prayer(いのり)", "Sounds(聞こえる)", "Status(状態異常)", "Traps(罠関連)"]);
// Upstream marks many entries TODO; we only display these as unreviewed
// references, with the original available for inspection.
const referenceText = (value) => value?.replace(/^=== TODO ===\s*/, "");
// Detect conflicts before filtering, so a rejected alternative cannot make an
// ambiguous source appear unambiguous.
const allTranslations = new Map();
for (const [group, english, rawJapanese] of rows.slice(1)) {
  const japanese = referenceText(rawJapanese);
  if (!supportedGroups.has(group) || !english || !japanese) continue;
  const values = allTranslations.get(english) ?? new Set();
  values.add(japanese);
  allTranslations.set(english, values);
}
const conflictingSources = new Set(
  [...allTranslations].filter(([, values]) => values.size > 1).map(([english]) => english),
);
stats.conflicts = conflictingSources.size;
for (const [group, english, rawJapanese] of rows.slice(1)) {
  const japanese = referenceText(rawJapanese);
  if (!supportedGroups.has(group)) continue;
  stats.candidateRows++;
  if (!english || !japanese || !english.trim() || !japanese.trim()) { reject("empty"); continue; }
  if (conflictingSources.has(english)) { reject("conflicting_translation"); continue; }
  if (/[\x00-\x1f\x7f]/.test(english + japanese)) { reject("control_or_multiline"); continue; }
  if (english !== english.trim() || japanese !== japanese.trim()) { reject("edge_whitespace"); continue; }
  // Quest reports can be emitted one wrapped line at a time. Longer exact
  // fragments are useful references there; short generic fragments are not.
  const questFragment = group === "Quest" && english.length >= 32 && /^[A-Za-z"']/.test(english);
  if (!/^[\x20-\x7e]+$/.test(english) || (!questFragment && (!/^[A-Z"']/.test(english) || !/[.!?]$/.test(english))) || !/\p{Script=Latin}/u.test(english)) { reject("not_a_complete_english_sentence"); continue; }
  if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(japanese)) { reject("no_japanese"); continue; }
  if (/(?:===|BEGIN:|END:|\[\s*(?:TODO|FIXME|TBD)\s*\]|【\s*(?:TODO|FIXME|TBD)\s*】)/i.test(english + japanese)) { reject("editorial_marker"); continue; }
  // Explanatory parentheticals can introduce unsupported information.
  if (!/[()]/.test(english) && /[（(]/.test(japanese)) { reject("added_parenthetical"); continue; }
  // These may convey user input, command keys, formatting, or game choices.
  if (/[\[\]{}%$`]/.test(english) || /(?:^|\s)[A-Za-z]-[A-Za-z](?:\s|$)|\b(?:ctrl|alt|shift|escape|esc|key|keys|press|type|command)\b/i.test(english) || /['"](?:\^|#|.)['"]/.test(english)) { reject("format_or_key"); continue; }
  if (/(?:%[0-9$+.# -]*[a-zA-Z]|\$\d+|\{\d+\})/.test(japanese)) { reject("format_in_translation"); continue; }
  const numbers = (s) => (s.match(/\d+/g) ?? []).join(",");
  if (numbers(english) !== numbers(japanese)) { reject("numeric_mismatch"); continue; }
  if (/\b(?:no|not|never|nothing|none|without|cannot|can't|won't|don't|doesn't|didn't|isn't|aren't|hasn't|haven't|couldn't|wouldn't|shouldn't)\b/i.test(english) && !/(?:ない|なく|ません|ませぬ|ず|ぬ|無|未|不|なし|いない|できず|やめ|駄目|ダメ|いいえ|違)/.test(japanese)) { reject("negative_needs_review"); continue; }
  if (/\bidentif\w*/i.test(english) && !/(?:識別|鑑定|特定|正体)/.test(japanese)) { reject("identification_needs_review"); continue; }
  if (/\bundead turning\b/i.test(english) && /不死身/.test(japanese)) { reject("known_bad_terminology"); continue; }
  if (forbidden.has(english)) { reject("known_bad_translation"); continue; }
  const values = grouped.get(english) ?? new Set();
  values.add(japanese);
  grouped.set(english, values);
}
const entries = [];
for (const [english, translations] of grouped) {
  entries.push([english, [...translations][0]]);
}
entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
stats.accepted = entries.length;
stats.sha256 = sourceSha256;
writeFileSync("src/i18n/data/nehww-messages.json", JSON.stringify(Object.fromEntries(entries), null, 2) + "\n");
writeFileSync("src/i18n/data/nehww-import-report.json", JSON.stringify(stats, null, 2) + "\n");
console.log(JSON.stringify(stats, null, 2));
