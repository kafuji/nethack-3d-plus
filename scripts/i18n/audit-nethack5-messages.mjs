// Static triage only: a WASM string may never be displayed, and printf
// strings need runtime arguments. This is not a gameplay coverage percentage.
import { readFileSync } from "node:fs";
import ts from "typescript";

function dictionaryKeys(file, variable) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let object;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === variable && node.initializer && ts.isObjectLiteralExpression(node.initializer)) object = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!object) throw new Error(`Cannot find ${variable} in ${file}`);
  return new Set(object.properties.flatMap((property) =>
    ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name) ? [property.name.text] : [],
  ));
}

const curated = new Set([
  ...dictionaryKeys("src/i18n/game-messages.ts", "japaneseMessages"),
  ...dictionaryKeys("src/i18n/game-prompts.ts", "japanesePrompts"),
  ...dictionaryKeys("src/i18n/nethack5-extra-messages.ts", "nethack5ExtraMessages"),
]);
const references = JSON.parse(readFileSync("src/i18n/data/nehww-messages.json", "utf8"));
const binary = readFileSync("public/nethack-5.wasm").toString("latin1");
const allSentences = process.argv.includes("--all-sentences");
const candidates = [...new Set(binary.match(/[\x20-\x7e]{8,}(?=\x00)/g) ?? [])]
  .filter((s) => (allSentences ? /^[A-Z]/.test(s) : /^(?:You|Your|There|This|That|The|A|An|It|What|Where|Which|Do|Are|Really|Nothing|Never|Beware|Something|As|Suddenly|No|I|They)\b/.test(s)) && /[.!?]$/.test(s))
  .sort();
const formatted = candidates.filter((s) => /%(?:\d+\$)?[-+ #0.\d*]*[a-z]/i.test(s));
const plain = candidates.filter((s) => !/%(?:\d+\$)?[-+ #0.\d*]*[a-z]/i.test(s));
const manuallyMatched = plain.filter((s) => curated.has(s));
const referenceMatched = plain.filter((s) => !curated.has(s) && Object.hasOwn(references, s));
const unmatched = plain.filter((s) => !curated.has(s) && !Object.hasOwn(references, s));
const report = {
  note: "Static candidates only; includes internal strings and omits dynamic runtime output. Not a translation coverage percentage.",
  totalCandidates: candidates.length,
  printfCandidates: formatted.length,
  plainCandidates: plain.length,
  curatedExact: manuallyMatched.length,
  unreviewedReferenceExact: referenceMatched.length,
  unmatchedExact: unmatched.length,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--unmatched")) {
  console.log("\nPlain strings without an exact translation:");
  for (const candidate of unmatched) console.log(candidate);
  console.log("\nStrings requiring runtime formatting:");
  for (const candidate of formatted) console.log(candidate);
}
