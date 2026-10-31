// Lists NetHack 5.0 message formats from the C sources that have no Japanese
// entry. Usage: node scripts/i18n/audit-nethack5-source.mjs <NetHack source dir> [--list]
// The source revision is recorded in docs/nethack-5-upstream-update-*.md.
// Static triage only: messages assembled with Sprintf/Strcat are not found,
// and formats whose conversions carry English grammar are intentionally left.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.argv[2];
if (!root) throw new Error("Pass the NetHack source directory.");
const prefixes = {
  You: "You ", Your: "Your ", You_feel: "You feel ", You_hear: "You hear ", You_see: "You see ", You_cant: "You can't ",
  You_are: "You are ", pline_The: "The ", There: "There ", pline: "", Norep: "", verbalize: "", urgent_pline: "", pline_mon: "", pline_xy: "",
};
const literal = String.raw`"(?:[^"\\\n]|\\.)*"`;
const call = new RegExp(String.raw`\b(${Object.keys(prefixes).join("|")})\s*\(\s*(?:[^,()"]+,\s*){0,3}?((?:${literal}\s*)+)`, "g");
const formats = new Set();
for (const file of readdirSync(path.join(root, "src")).filter((name) => name.endsWith(".c"))) {
  const source = readFileSync(path.join(root, "src", file), "latin1").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of source.matchAll(call)) {
    const text = [...match[2].matchAll(new RegExp(literal, "g"))].map((part) => JSON.parse(part[0].replace(/\\'/g, "'"))).join("");
    if (text.trim() && !/[\r\n]/.test(text)) formats.add(prefixes[match[1]] + text);
  }
}
function dictionaryKeys(file, variable) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const keys = new Set();
  (function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === variable && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const property of node.initializer.properties) if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name)) keys.add(property.name.text);
    }
    ts.forEachChild(node, visit);
  })(source);
  return keys;
}
const known = new Set([
  ...Object.keys(JSON.parse(readFileSync("src/i18n/data/nethack5-source-ja.json", "utf8"))),
  ...dictionaryKeys("src/i18n/game-messages.ts", "japaneseMessages"),
  ...dictionaryKeys("src/i18n/game-prompts.ts", "japanesePrompts"),
  ...dictionaryKeys("src/i18n/nethack5-extra-messages.ts", "nethack5ExtraMessages"),
]);
const missing = [...formats].filter((format) => !known.has(format)).sort();
console.log(JSON.stringify({ sourceFormats: formats.size, withoutDirectEntry: missing.length,
  note: "Curated regular-expression templates are not counted; use --list to review." }, null, 2));
if (process.argv.includes("--list")) for (const format of missing) console.log(format);
