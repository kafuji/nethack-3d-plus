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
      out += " " + src.slice(i, end < 0 ? src.length : end).replace(/[^\n]/g, "");
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

/** Top-level "cond ? a : b" of an expression, ignoring parentheses and strings. */
function splitTernary(expr) {
  let depth = 0, question = -1, nested = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < expr.length && expr[j] !== ch) j += expr[j] === "\\" ? 2 : 1;
      i = j;
    } else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === "?") {
      if (question < 0) question = i; else nested++;
    } else if (depth === 0 && ch === ":" && question >= 0) {
      if (nested > 0) nested--;
      else return [expr.slice(question + 1, i).trim(), expr.slice(i + 1).trim()];
    }
  }
  return null;
}

const bodyParts = { HAND: "hand", LEG: "leg", FACE: "face", FOOT: "foot", ARM: "arm", HEAD: "head", FINGER: "finger", FINGERTIP: "fingertip", BLOOD: "blood", NECK: "neck", HAIR: "hair", EYE: "eye", STOMACH: "stomach", TOE: "toe", LUNG: "lung", SPINE: "spine", NOSE: "nose", BONE: "bone", TONGUE: "tongue", BELLY: "belly", CHEST: "chest", BACK: "back", SKIN: "skin", LIGHT_HEADED: "light headed" };
const colorNames = { NH_RED: "red", NH_BLUE: "blue", NH_GREEN: "green", NH_BLACK: "black", NH_WHITE: "white", NH_AMBER: "amber", NH_SILVER: "silver", NH_GOLDEN: "golden", NH_LIGHT_BLUE: "light blue", NH_PURPLE: "purple", NH_ORANGE: "orange", NH_YELLOW: "yellow", NH_BROWN: "brown", NH_GRAY: "gray" };

// The enclosing function's source, set for each call: variables and tables resolve against it.
let scope = "";
let fileSource = "";
const resolving = new Set();

function resolveName(name) {
  if (resolving.has(name)) return null;
  resolving.add(name);
  try {
    const values = [];
    for (const m of scope.matchAll(new RegExp(String.raw`\b${name}\s*=\s*([^;=][^;]*);`, "g"))) values.push(...fills(m[1].trim()));
    for (const m of scope.matchAll(new RegExp(String.raw`\bStrcpy\(\s*${name}\s*,\s*([^;]+)\);`, "g"))) values.push(...fills(m[1].trim()));
    const table = new RegExp(String.raw`\b${name.replace(/\[.*$/, "")}\s*\[[^\]]*\]\s*=\s*\{([^}]*)\}`).exec(fileSource);
    if (table) values.push(...[...table[1].matchAll(literalRe)].map((m) => m[1]));
    const known = values.filter((value) => !/^(?:the jackal|the dagger|it)$/.test(value));
    return known.length ? [...new Set(known)].slice(0, 8) : null;
  } finally {
    resolving.delete(name);
  }
}

/** Representative values for one %s argument expression. */
function fills(arg) {
  const lit = literalValue(arg);
  if (lit !== null) return [lit];
  const paren = /^\((?:const char \*|char \*)\)\s*(.+)$/.exec(arg);
  if (paren) return fills(paren[1]);
  const ternary = splitTernary(arg);
  if (ternary) return [...new Set([...fills(ternary[0]), ...fills(ternary[1])])];
  if (/^\(.*\)$/.test(arg) && !/^\([^()]*\)[^()]*\(/.test(arg)) return fills(arg.slice(1, -1).trim());
  const part = /\b(?:body_part|mbodypart)\s*\((?:[^,()]*,\s*)?([A-Z_]+)\)/.exec(arg);
  if (part && bodyParts[part[1]]) return [/makeplural/.test(arg) ? `${bodyParts[part[1]]}s` : bodyParts[part[1]]];
  const color = /\bhcolor\s*\((NH_[A-Z_]+)\)/.exec(arg);
  if (color && colorNames[color[1]]) return [colorNames[color[1]]];
  if (/\bcurrency\s*\(/.test(arg)) return ["zorkmids"];
  if (/\bshkname\s*\(/.test(arg)) return ["Asidonhopo"];
  if (/\bshtypes\b/.test(arg)) return ["general store"];
  if (/\bplur\s*\(/.test(arg)) return ["", "s"];
  if (/\bexclam\s*\(/.test(arg)) return ["!", "."];
  if (/\bShk_Your\s*\(/.test(arg)) return ["Your "];
  if (/\bceiling\s*\(/.test(arg)) return ["ceiling"];
  if (/\btrapname\s*\(/.test(arg)) return ["pit"];
  if (/^[a-z_][a-z0-9_]*(?:\[[^\]]*\])?$/i.test(arg)) {
    const resolved = resolveName(arg.replace(/\[.*$/, ""));
    if (resolved) return resolved;
  }
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
  fileSource = src;
  const callRe = new RegExp(String.raw`\b(${Object.keys(prefixes).join("|")})\s*\(`, "g");
  for (const match of src.matchAll(callRe)) {
    const fn = match[1];
    const open = match.index + match[0].length - 1;
    const before = src.slice(Math.max(0, match.index - 12), match.index);
    if (/(?:void|static|define)\s*$/.test(before)) continue;
    const args = callArgs(src, open);
    if (!args) continue;
    // A function starts at a closing brace in the first column.
    scope = src.slice(Math.max(src.lastIndexOf("\n}", match.index), 0), match.index);
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
      if (c[2] === "c") return [c.index + c[0].length === format.length ? "!" : "a"];
      return ["2"];
    });
    const samples = new Set();
    const total = slotFills.reduce((product, f) => product * f.length, 1);
    const step = Math.max(1, Math.floor(total / 24));
    for (let k = 0; k < total && samples.size < 24; k += step) {
      let i = 0, rest = k;
      const text = format.replace(conversionRe, (m) => {
        if (m === "%%") return "%";
        const f = slotFills[i++];
        const value = f[rest % f.length];
        rest = Math.floor(rest / f.length);
        return value;
      });
      samples.add((prefixes[fn] + text).replace(/\s+$/, ""));
    }
    entries.push({ file, line, format: prefixes[fn] + format, args: rest.join(" ,, ").replace(/\s+/g, " ").slice(0, 300), samples: [...samples] });
  }
}
writeFileSync(outFile, JSON.stringify(entries, null, 1));
console.log(entries.length);
