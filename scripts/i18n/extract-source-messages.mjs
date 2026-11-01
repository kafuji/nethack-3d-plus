// Extracts pline-family message formats from a NetHack source tree and builds
// representative sample messages for each, with argument values guessed from
// the C expressions (Monnam() -> "The jackal", Tobjnam(x, "toot") -> "The flute
// toots", ...). src/i18n/source-message-coverage.test.ts runs the samples
// through the display translation and lists those still shown in English.
// Usage: node scripts/i18n/extract-source-messages.mjs <NetHack src dir> <out.json>
// Static triage only: Sprintf-assembled messages are missed and guessed
// arguments can produce nonsense samples, so review the report by hand.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [srcDir, outFile] = process.argv.slice(2);
const prefixes = {
  You: "You ", Your: "Your ", You_feel: "You feel ", You_hear: "You hear ", You_see: "You see ", You_cant: "You can't ",
  You_are: "You are ", pline_The: "The ", There: "There ", pline: "", Norep: "", verbalize: "", urgent_pline: "",
  pline_mon: "", pline_xy: "", custompline: "", com_pline: "",
};
// Arguments skipped before the format for some functions.
const skipArgs = { pline_mon: 1, pline_xy: 2, custompline: 1 };

function stripComments(src) {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      out += " ";
      i = end < 0 ? src.length : end + 1;
    } else if (ch === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      i = end < 0 ? src.length : end - 1;
    } else out += ch;
  }
  return out;
}

/** Split call arguments at top level starting at index of "(". Returns [args, endIndex]. */
function callArgs(src, open) {
  const args = [];
  let depth = 0, start = open + 1;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) j += src[j] === "\\" ? 2 : 1;
      i = j;
    } else if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) { args.push(src.slice(start, i).trim()); return args; }
    } else if (ch === "," && depth === 1) { args.push(src.slice(start, i).trim()); start = i + 1; }
  }
  return null;
}

const literalRe = /"((?:[^"\\\n]|\\.)*)"/g;
function literalValue(expr) {
  if (!/^\s*(?:"(?:[^"\\\n]|\\.)*"\s*)+$/.test(expr)) return null;
  return [...expr.matchAll(literalRe)].map((m) => JSON.parse(`"${m[1].replace(/\\'/g, "'").replace(/\\([0-7]{1,3})/g, "")}"`)).join("");
}

const verbS = (v) => {
  if (/^(?:is|are)$/.test(v)) return "is";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  if (/(?:s|sh|ch|x|z|o)$/.test(v)) return v + "es";
  return v + "s";
};

/** Representative values for one %s argument expression. */
function fills(arg) {
  const lit = literalValue(arg);
  if (lit !== null) return [lit];
  const tern = /^[^?]*\?\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")\s*$/.exec(arg);
  if (tern) return [literalValue(tern[1]), literalValue(tern[2])];
  const verb = /"([a-z][a-z ]*)"/.exec(arg)?.[1];
  if (/\bTobjnam\s*\(/.test(arg) && verb) return [`The flute ${verbS(verb)}`, `The dagger ${verbS(verb)}`];
  if (/\bYobjnam2\s*\(/.test(arg) && verb) return [`Your dagger ${verbS(verb)}`];
  if (/\bTobjnam\s*\(|\bYobjnam2\s*\(/.test(arg)) return ["The dagger"];
  if (/\b(?:otense|vtense|vobj)\s*\(/.test(arg) && verb) return [verbS(verb)];
  if (/\bMonnam\s*\(|\bYMonnam|\bAmonnam|\bMonnam/.test(arg)) return ["The jackal", "It"];
  if (/\b(?:mon_nam|a_monnam|y_monnam|noit_mon_nam|some_mon_nam|mon_nam_too|x_monnam)\s*\(/.test(arg)) return ["the jackal", "it"];
  if (/\bmhis\b|\bmhis\s*\(/.test(arg)) return ["its"];
  if (/\bmhim\b|\bmhim\s*\(/.test(arg)) return ["it"];
  if (/\bmhe\b|\bmhe\s*\(/.test(arg)) return ["it"];
  if (/\bs_suffix\s*\(/.test(arg)) return ["the jackal's"];
  if (/\bbody_part\s*\(|\bmbodypart\s*\(/.test(arg)) return ["hand", "hands"];
  if (/\bmakeplural\s*\(/.test(arg)) return ["hands"];
  if (/\b(?:plur|vtense)\s*\(/.test(arg)) return [""];
  if (/\b(?:Doname2|The|An|A)\s*\(/.test(arg) && /^[A-Z]/.test(arg)) return ["The dagger"];
  if (/\b(?:yname|Yname2|yobjnam|ysimple_name)\s*\(/.test(arg)) return ["your dagger"];
  if (/\b(?:xname|doname|the|an|simple_typename|cxname|distant_name|aobjnam|singular|killer_xname|ansimpleoname|thesimpleoname)\s*\(/.test(arg)) return ["the dagger", "a dagger"];
  if (/\bsurface\s*\(|ceiling\s*\(/.test(arg)) return ["floor"];
  if (/\bhcolor\s*\(|\bNH_[A-Z]+|colors?\b/.test(arg)) return ["red"];
  if (/\ba_gname|\bu_gname|\bgname|\balign_gname|\bhalu_gname/.test(arg)) return ["Anhur"];
  if (/plname|svp\.plname|\bplname\b/.test(arg)) return ["Agent"];
  if (/\bsomeone|\bsomething/.test(arg)) return ["something"];
  return ["the jackal", "the dagger", "it"];
}

const conversionRe = /%(?:\d+\$)?[-+ #0]*(\d*|\*)(?:\.\d+)?(?:ll|l|h|z)?([sdiucfoxXp])|%%/g;

const entries = [];
for (const file of readdirSync(srcDir).filter((name) => name.endsWith(".c"))) {
  const raw = readFileSync(path.join(srcDir, file), "latin1");
  const src = stripComments(raw);
  const callRe = new RegExp(String.raw`\b(${Object.keys(prefixes).join("|")})\s*\(`, "g");
  for (const match of src.matchAll(callRe)) {
    const fn = match[1];
    const open = match.index + match[0].length - 1;
    const before = src.slice(Math.max(0, match.index - 12), match.index);
    if (/(?:void|static|define)\s*$/.test(before)) continue;
    const args = callArgs(src, open);
    if (!args) continue;
    const skip = skipArgs[fn] ?? 0;
    const format = literalValue(args[skip] ?? "");
    if (format === null || !format.trim() || /\n/.test(format)) continue;
    const rest = args.slice(skip + 1);
    const line = src.slice(0, match.index).split("\n").length;
    const convs = [...format.matchAll(conversionRe)].filter((m) => m[0] !== "%%");
    let argIndex = 0;
    const slotFills = convs.map((c) => {
      if (c[1] === "*") argIndex++;
      const arg = rest[argIndex++] ?? "";
      if (c[2] === "s") return fills(arg);
      if (c[2] === "c") return ["a"];
      return ["2"];
    });
    const count = Math.max(1, ...slotFills.map((f) => f.length));
    const samples = new Set();
    for (let k = 0; k < count; k++) {
      let i = 0;
      const text = format.replace(conversionRe, (m) => {
        if (m === "%%") return "%";
        const f = slotFills[i++];
        return f[Math.min(k, f.length - 1)];
      });
      samples.add((prefixes[fn] + text).replace(/\s+$/, ""));
    }
    entries.push({ file, line, format: prefixes[fn] + format, args: rest.join(" ,, ").replace(/\s+/g, " ").slice(0, 300), samples: [...samples] });
  }
}
writeFileSync(outFile, JSON.stringify(entries, null, 1));
console.log(entries.length);
