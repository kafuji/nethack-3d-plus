#!/usr/bin/env node
// Extract English -> Japanese game text data from a JNetHack checkout.
//
// Usage:
//   node scripts/plus/extract-jnethack-texts.mjs <jnethack-dir> <vanilla-nethack-dir> [out-file]
//
// - Monster and object names are paired by their enum identifier (last macro
//   argument) between JNetHack's and vanilla NetHack's monsters.h/objects.h.
// - Message templates come from JNetHack's `/*JP <english> */ <japanese>` and
//   `#if 0 /*JP*/ <english> #else <japanese> #endif` source annotations.
//
// The Japanese text is from JNetHack (https://github.com/jnethack) and is
// distributed under the NetHack General Public License.
import fs from "node:fs";
import path from "node:path";

const [jnhDir, vanillaDir, outFile = "src/plus/game-text/data/jnethack.generated.json"] =
  process.argv.slice(2);
if (!jnhDir || !vanillaDir) {
  console.error("usage: extract-jnethack-texts.mjs <jnethack-dir> <vanilla-dir> [out-file]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Minimal C lexing helpers.

/** Decode a C string literal body (without quotes). */
function decodeCString(body) {
  return body.replace(/\\(x[0-9a-fA-F]+|[0-7]{1,3}|.)/g, (_, esc) => {
    if (esc[0] === "x") return String.fromCharCode(parseInt(esc.slice(1), 16));
    if (/^[0-7]/.test(esc)) return String.fromCharCode(parseInt(esc, 8));
    return { n: "\n", t: "\t", r: "\r", "\\": "\\", '"': '"', "'": "'", "0": "\0" }[esc] ?? esc;
  });
}

/** Strip comments (keeping strings intact). */
function stripComments(src) {
  let out = "";
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      let j = i + 1;
      while (j < src.length && src[j] !== q) j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 1;
      out += " ";
    } else if (ch === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      i = end < 0 ? src.length : end - 1;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Split top-level comma separated args of the text inside parens. */
function splitArgs(text) {
  const args = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) j += text[j] === "\\" ? 2 : 1;
      cur += text.slice(i, j + 1);
      i = j;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
    if (ch === "," && depth === 0) {
      args.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

/** Find `name(` at index and return the paren body and end index. */
function readParenBody(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) j += text[j] === "\\" ? 2 : 1;
      i = j;
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) return { body: text.slice(openIndex + 1, i), end: i };
    }
  }
  return null;
}

/** If the expression is only (concatenated) string literals, return the value. */
function literalValue(expr) {
  const trimmed = expr.trim();
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let rest = trimmed;
  let value = "";
  let m;
  let last = 0;
  while ((m = re.exec(trimmed))) {
    if (trimmed.slice(last, m.index).trim()) return null;
    value += decodeCString(m[1]);
    last = re.lastIndex;
  }
  rest = trimmed.slice(last).trim();
  if (rest || last === 0) return null;
  return value;
}

// ---------------------------------------------------------------------------
// Monsters and objects: pair string literals by enum identifier.

function extractEntries(file, macroNames) {
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const entries = new Map();
  const re = new RegExp(`\\b(${macroNames.join("|")})\\s*\\(`, "g");
  let m;
  while ((m = re.exec(src))) {
    // skip macro definitions
    const lineStart = src.lastIndexOf("\n", m.index) + 1;
    if (/^\s*#\s*define/.test(src.slice(lineStart, m.index))) continue;
    const paren = readParenBody(src, m.index + m[0].length - 1);
    if (!paren) continue;
    const args = splitArgs(paren.body);
    const id = args[args.length - 1]?.trim();
    if (!id || !/^[A-Z_][A-Z0-9_]*$/.test(id)) continue;
    const strings = [];
    for (const lit of paren.body.matchAll(/"((?:[^"\\]|\\.)*)"/g)) strings.push(decodeCString(lit[1]));
    if (strings.length === 0) continue;
    entries.set(`${m[1]}:${id}`, strings);
    re.lastIndex = paren.end;
  }
  return entries;
}

function pairNames(jaFile, enFile, macros, categoryOf = () => "all") {
  const ja = extractEntries(jaFile, macros);
  const en = extractEntries(enFile, macros);
  const result = {};
  for (const [key, enStrings] of en) {
    const jaStrings = ja.get(key);
    if (!jaStrings || jaStrings.length !== enStrings.length) continue;
    const [macro, id] = key.split(":");
    const category = categoryOf(macro, id);
    const table = (result[category] ??= {});
    enStrings.forEach((value, index) => {
      const jaValue = jaStrings[index];
      if (value && jaValue && value !== jaValue && !table[value]) table[value] = jaValue;
    });
  }
  return result;
}

const monsters = pairNames(
  path.join(jnhDir, "include/monsters.h"),
  path.join(vanillaDir, "include/monsters.h"),
  ["MON"],
).all;

// Object categories drive both name parsing ("potion of X") and the
// Japanese counter word (本, 着, 枚, ...).
const objectCategoryByMacro = {
  WEAPON: "weapon", PROJECTILE: "weapon", BOW: "weapon",
  ARMOR: "armor", HELM: "armor", CLOAK: "armor", SHIELD: "armor", GLOVES: "armor", BOOTS: "armor",
  RING: "ring", AMULET: "amulet",
  TOOL: "tool", CONTAINER: "tool", WEPTOOL: "tool",
  FOOD: "food", POTION: "potion", SCROLL: "scroll", SPELL: "spellbook", WAND: "wand",
  COIN: "coin", GEM: "gem", ROCK: "rock", OBJECT: "other", EXPLOSIVE_TRAP_OBJ: "other",
};
const objects = pairNames(
  path.join(jnhDir, "include/objects.h"),
  path.join(vanillaDir, "include/objects.h"),
  Object.keys(objectCategoryByMacro),
  (macro) => objectCategoryByMacro[macro],
);

// Map features ("doorway", "fountain") from defsym.h, paired by S_ symbol.
function extractDefsyms(file) {
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const entries = new Map();
  for (const m of src.matchAll(/\bPCHAR2?\s*\(/g)) {
    const paren = readParenBody(src, m.index + m[0].length - 1);
    if (!paren) continue;
    const args = splitArgs(paren.body);
    const id = args.find((arg) => /^S_\w+$/.test(arg));
    const strings = args.map(literalValue).filter((v) => v !== null);
    if (id && strings.length) entries.set(id, strings);
  }
  return entries;
}
const features = {};
{
  const ja = extractDefsyms(path.join(jnhDir, "include/defsym.h"));
  for (const [id, enStrings] of extractDefsyms(path.join(vanillaDir, "include/defsym.h"))) {
    const jaStrings = ja.get(id);
    if (!jaStrings) continue;
    // Vanilla PCHAR(desc) where desc doubles as the explanation; JNetHack
    // uses PCHAR2(desc, japanese explanation).
    const pairs =
      enStrings.length === 1 && jaStrings.length === 2
        ? [[enStrings[0], jaStrings[1]]]
        : enStrings.length === jaStrings.length
          ? enStrings.map((value, i) => [value, jaStrings[i]])
          : [];
    for (const [value, jaValue] of pairs) {
      if (value && jaValue && value !== jaValue && !features[value]) features[value] = jaValue;
    }
  }
}

// Humanoid body part names (polyself.c humanoid_parts), used for messages
// such as "Your legs get new energy."
const bodyParts = {};
{
  const src = fs.readFileSync(path.join(jnhDir, "src/polyself.c"), "utf8");
  const block = /\*humanoid_parts\[\] = \{([^}]*)\},\s*#else\s*\*humanoid_parts\[\] = \{([^}]*)\}/.exec(src);
  if (block) {
    const lits = (text) => [...text.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    const en = lits(block[1]);
    const ja = lits(block[2]);
    if (en.length === ja.length) en.forEach((value, i) => (bodyParts[value] = ja[i]));
  }
}

// Dungeon branch names from dat/dungeon.lua, paired by position.
const dungeons = {};
{
  const names = (file) => [...fs.readFileSync(file, "utf8").matchAll(/name = "([^"]+)"/g)].map((m) => m[1]);
  const en = names(path.join(vanillaDir, "dat/dungeon.lua"));
  const ja = names(path.join(jnhDir, "dat/dungeon.lua"));
  if (en.length === ja.length) {
    en.forEach((value, i) => {
      if (value !== ja[i]) dungeons[value] = ja[i];
    });
  }
}

// Role, rank and god names from role.c: literals inside each
// `#if 0 /*JP*/ <english> #else <japanese> #endif` block, paired by position.
const roleNames = {};
{
  const src = fs.readFileSync(path.join(jnhDir, "src/role.c"), "utf8");
  const lits = (text) => [...stripComments(text).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => decodeCString(m[1]));
  for (const m of src.matchAll(/#\s*if 0 \/\*JP[^\n]*\n([\s\S]*?)\n\s*#\s*else[^\n]*\n([\s\S]*?)\n\s*#\s*endif/g)) {
    // Rank titles are { male, female } tuples; gods and quest places are
    // plain literals after them.
    const tupleRe = /\{\s*("(?:[^"\\]|\\.)*"|0)\s*,\s*("(?:[^"\\]|\\.)*"|0)\s*\}/g;
    const parse = (text) => {
      const clean = stripComments(text);
      const tuples = [...clean.matchAll(tupleRe)].map((t) =>
        [t[1], t[2]].map((v) => (v === "0" ? null : decodeCString(v.slice(1, -1)))),
      );
      const rest = clean.replace(tupleRe, "");
      return { tuples, plain: lits(rest).map((v) => v.replace(/^_/, "")) };
    };
    const en = parse(m[1]);
    const ja = parse(m[2]);
    // The Japanese block of each role starts with the role's own name tuple,
    // which the English block keeps outside the #if.
    if (ja.tuples.length === en.tuples.length + 1) ja.tuples.shift();
    const add = (value, jaValue) => {
      if (value && jaValue && /[A-Za-z]/.test(value) && value !== jaValue && !roleNames[value]) {
        roleNames[value] = jaValue;
      }
    };
    if (ja.tuples.length === en.tuples.length) {
      en.tuples.forEach(([male, female], i) => {
        const [jaMale, jaFemale] = ja.tuples[i];
        add(male, jaMale);
        add(female, jaFemale ?? jaMale);
      });
    }
    if (ja.plain.length === en.plain.length) en.plain.forEach((value, i) => add(value, ja.plain[i]));
  }
}

// Quest and legacy-intro texts from dat/quest.lua, paired by table path.
function extractQuestTexts(file) {
  const src = fs.readFileSync(file, "utf8");
  const result = new Map();
  const stack = [];
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{|\}|(text|synopsis)\s*=\s*(?:\[\[([\s\S]*?)\]\]|"((?:[^"\\]|\\.)*)")|--[^\n]*/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[0].startsWith("--")) continue;
    if (m[1]) stack.push(m[1]);
    else if (m[0] === "}") stack.pop();
    else if (m[2]) result.set(`${stack.join(".")}.${m[2]}`, m[3] ?? decodeCString(m[4] ?? ""));
  }
  return result;
}
const questTexts = [];
{
  const ja = extractQuestTexts(path.join(jnhDir, "dat/quest.lua"));
  for (const [key, value] of extractQuestTexts(path.join(vanillaDir, "dat/quest.lua"))) {
    const jaValue = ja.get(key);
    if (jaValue && jaValue !== value && /[A-Za-z]{3}/.test(value)) questTexts.push([value, jaValue]);
  }
}

// ---------------------------------------------------------------------------
// Message templates from JP annotations.

// English and Japanese prefixes added by the pline-family helpers.
const outputFunctions = {
  pline: ["", ""],
  pline_mon: ["", ""],
  pline_dir: ["", ""],
  pline_xy: ["", ""],
  Norep: ["", ""],
  urgent_pline: ["", ""],
  custompline: ["", ""],
  raw_printf: ["", ""],
  You: ["You ", "あなたは"],
  Your: ["Your ", "あなたの"],
  You_feel: ["You feel ", "あなたは"],
  You_cant: ["You can't ", "あなたは"],
  You_hear: ["You hear ", "あなたは"],
  You_see: ["You see ", "あなたは"],
  pline_The: ["The ", ""],
  There: ["There ", ""],
  verbalize: ['"', "「"],
  Sprintf: ["", ""],
  Snprintf: ["", ""],
  Strcpy: ["", ""],
  enlght_out: ["", ""],
  putstr: ["", ""],
  yn_function: ["", ""],
};
const formatArgIndex = {
  Sprintf: 1, Snprintf: 2, custompline: 1, pline_mon: 1, pline_dir: 1, pline_xy: 2, Strcpy: 1, putstr: 2,
};
const suffixes = { verbalize: ['"', "」"] };

function findCall(stmt) {
  const re = new RegExp(`\\b(${Object.keys(outputFunctions).join("|")})\\s*\\(`);
  const m = re.exec(stmt);
  if (!m) return null;
  const paren = readParenBody(stmt, m.index + m[0].length - 1);
  if (!paren) return null;
  const args = splitArgs(paren.body);
  const fmtIndex = formatArgIndex[m[1]] ?? 0;
  const fmt = literalValue(args[fmtIndex] ?? "");
  if (fmt === null) return null;
  return { fn: m[1], fmt, args: args.slice(fmtIndex + 1).map((a) => a.replace(/\s+/g, " ")) };
}

const conversionRe = /%(?:\d+\$)?[-+ #0]*(\d+|\*)?(?:\.\d+)?(?:hh|h|ll|l|z)?([sdiuc%])/g;

function parseFormat(fmt) {
  const specs = [];
  const parts = [];
  let last = 0;
  for (const m of fmt.matchAll(conversionRe)) {
    parts.push(fmt.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[2] === "%") {
      parts[parts.length - 1] += "%";
      continue;
    }
    if (m[1] === "*") return null;
    specs.push(m[2]);
    parts.push(null);
  }
  parts.push(fmt.slice(last));
  // merge literal parts around escaped %%
  const merged = [];
  for (const p of parts) {
    if (p !== null && typeof merged[merged.length - 1] === "string") merged[merged.length - 1] += p;
    else merged.push(p);
  }
  return { specs, parts: merged };
}

const templates = new Map();
// Enlightenment / end-of-game attribute lines: "You are fast." etc.
// key "<english macro>|<english attr>" -> "<japanese macro>|<japanese attr>"
const enlightenment = {};
const enlMacros = ["you_are_ing", "you_have_been", "you_have_never", "you_have_X", "you_are", "you_have", "you_can"];

function addEnlightenmentPair(enStmt, jaStmt) {
  const call = (stmt) => {
    const m = new RegExp(`\\b(${enlMacros.join("|")})\\s*\\(`).exec(stmt);
    if (!m) return null;
    const paren = readParenBody(stmt, m.index + m[0].length - 1);
    if (!paren) return null;
    const attr = literalValue(splitArgs(paren.body)[0] ?? "");
    return attr === null ? null : { macro: m[1], attr };
  };
  const en = call(enStmt);
  const ja = call(jaStmt);
  if (en && ja && /[A-Za-z]/.test(en.attr)) {
    const key = `${en.macro}|${en.attr}`;
    if (!enlightenment[key]) enlightenment[key] = `${ja.macro}|${ja.attr}`;
  }
  addEnlightenmentSentences(enStmt, jaStmt);
}

// Generic enl_msg(prefix, present, past, suffix, ps) pairs, expanded into
// whole sentences for both tenses and stored as plain templates. English
// enlght_line() prints prefix+verb+suffix+ps, JNetHack prints
// prefix+ps+suffix+verb; ps (the "because of" detail) is not modeled.
const enlWords = {
  en: {
    You_: "You ", are: "are ", were: "were ", have: "have ", had: "had ", can: "can ", could: "could ",
    have_been: "have been ", have_never: "have never ", never: "never ",
  },
  ja: {
    You_: "あなたは", are: "である", were: "であった", have: "をもっている", had: "をもっていた",
    can: "できる", could: "できた", iru: "いる", ita: "いた",
  },
};
const enlMacroExpansion = {
  en: {
    you_are: ["You_", "are", "were"], you_have: ["You_", "have", "had"], you_can: ["You_", "can", "could"],
    you_have_been: ["You_", "have_been", "were"], you_have_never: ["You_", "have_never", "never"],
    you_have_X: ["You_", "have", '""'],
  },
  ja: {
    you_are: ["You_", "are", "were"], you_have: ["You_", "have", "had"], you_can: ["You_", "can", "could"],
    you_have_been: ["You_", "are", "were"], you_are_ing: ["You_", "iru", "ita"],
  },
};
const contractions = [
  [" are not ", " aren't "], [" were not ", " weren't "], [" have not ", " haven't "],
  [" had not ", " hadn't "], [" can not ", " can't "], [" could not ", " couldn't "],
];

function enlCall(stmt, side) {
  const names = ["enl_msg", ...Object.keys(enlMacroExpansion[side]), ...(side === "ja" ? ["you_have_never", "you_have_X"] : [])];
  const m = new RegExp(`\\b(${names.join("|")})\\s*\\(`).exec(stripComments(stmt));
  if (!m) return null;
  const text = stripComments(stmt);
  const paren = readParenBody(text, m.index + m[0].length - 1);
  if (!paren) return null;
  const args = splitArgs(paren.body);
  let parts;
  if (m[1] === "enl_msg") parts = args.slice(0, 4);
  else if (side === "ja" && m[1] === "you_have_never") parts = [args[0], '"ていない"', '"なかった"', '""'];
  else if (side === "ja" && m[1] === "you_have_X") parts = [args[0], '"ている"', '"た"', '""'];
  else {
    const [prefix, present, past] = enlMacroExpansion[side][m[1]];
    parts = [prefix, present, past, args[0]];
  }
  const resolved = parts.map((arg) => {
    const trimmed = (arg ?? "").trim();
    if (trimmed in enlWords[side]) return enlWords[side][trimmed];
    return literalValue(trimmed);
  });
  if (resolved.some((v) => v === null)) return null;
  const [prefix, present, past, suffix] = resolved;
  return { prefix, present, past, suffix };
}

function addEnlightenmentSentences(enStmt, jaStmt) {
  const en = enlCall(enStmt, "en");
  const ja = enlCall(jaStmt, "ja");
  if (!en || !ja || !/[A-Za-z]{3}/.test(en.suffix + en.prefix)) return;
  for (const tense of ["present", "past"]) {
    let english = ` ${en.prefix}${en[tense]}${en.suffix}.`;
    for (const [full, short] of contractions) english = english.replace(full, short);
    english = english.trim().replace(/\s+/g, " ");
    const japanese = `${ja.prefix}${ja.suffix}${ja[tense]}．`;
    if (!templates.has(english)) templates.set(english, japanese);
  }
}
let pairCount = 0;


/**
 * Message tables written as plain literal lists inside #if 0 / #else, e.g.
 * timeout.c's slime and stoning texts. Placeholders keep their order.
 */
function addLiteralListPairs(enBlock, jaBlock) {
  const onlyLiterals = (block) => /^[\s,{}]*$/.test(stripComments(block).replace(/"(?:[^"\\]|\\.)*"/g, ""));
  if (!onlyLiterals(enBlock) || !onlyLiterals(jaBlock)) return;
  const lits = (block) => [...stripComments(block).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  const en = lits(enBlock);
  const ja = lits(jaBlock);
  if (en.length !== ja.length) return;
  en.forEach((enLiteral, i) => {
    // Only sentence-like entries: single words and fragments in these tables
    // are often building blocks whose translation depends on context.
    const value = decodeCString(enLiteral).trim();
    if (!/ /.test(value) || !/[.!?]$/.test(value)) return;
    const enSpecs = parseFormat(decodeCString(enLiteral));
    const jaSpecs = parseFormat(decodeCString(ja[i]));
    if (!enSpecs || !jaSpecs || enSpecs.specs.length !== jaSpecs.specs.length) return;
    const args = enSpecs.specs.map((_, n) => `, a${n}`).join("");
    addPair(`pline("${enLiteral}"${args});`, `pline("${ja[i]}"${args});`);
  });
}

/** Split a top-level `cond ? a : b` expression (right-associative). */
function splitTernary(expr) {
  const text = expr.trim();
  let depth = 0;
  let question = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) j += text[j] === "\\" ? 2 : 1;
      i = j;
      continue;
    }
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    else if (depth === 0 && ch === "?" && question < 0) question = i;
    else if (depth === 0 && ch === ":" && question >= 0) {
      // find the ':' that matches the first '?', skipping nested ternaries
      let nested = 0;
      for (let k = question + 1; k < text.length; k += 1) {
        const c = text[k];
        if (c === '"' || c === "'") {
          let j = k + 1;
          while (j < text.length && text[j] !== c) j += text[j] === "\\" ? 2 : 1;
          k = j;
          continue;
        }
        if (c === "(" || c === "[") depth += 1;
        else if (c === ")" || c === "]") depth -= 1;
        else if (depth === 0 && c === "?") nested += 1;
        else if (depth === 0 && c === ":") {
          if (nested === 0) {
            return {
              cond: text.slice(0, question).replace(/\s+/g, " ").replace(/^\(|\)$/g, "").trim(),
              then: text.slice(question + 1, k).trim(),
              else: text.slice(k + 1).trim(),
            };
          }
          nested -= 1;
        }
      }
      return null;
    }
  }
  return null;
}

/** Leaves of a (nested) ternary with the branch path that selects each. */
function ternaryLeaves(expr, path = "") {
  const t = splitTernary(expr);
  if (!t) return [{ path, expr: expr.trim() }];
  return [
    ...ternaryLeaves(t.then, `${path}[${t.cond}]T`),
    ...ternaryLeaves(t.else, `${path}[${t.cond}]F`),
  ];
}

/**
 * Expand ternary arguments of the output call into concrete statements, e.g.
 * You(!incr ? "feel hungry" : "are hungry") -> two calls. Keys describe the
 * chosen branches so English and Japanese variants can be paired.
 */
function callVariants(stmt) {
  const text = stripComments(stmt);
  const re = new RegExp(`\\b(${Object.keys(outputFunctions).join("|")})\\s*\\(`);
  const m = re.exec(text);
  if (!m) return [{ key: "", stmt }];
  const paren = readParenBody(text, m.index + m[0].length - 1);
  if (!paren) return [{ key: "", stmt }];
  const args = splitArgs(paren.body);
  let variants = [{ key: "", args: [] }];
  for (const arg of args) {
    const leaves = ternaryLeaves(arg);
    if (leaves.length > 4) return [{ key: "", stmt }];
    variants = variants.flatMap((v) => leaves.map((leaf) => ({ key: v.key + leaf.path, args: [...v.args, leaf.expr] })));
    if (variants.length > 16) return [{ key: "", stmt }];
  }
  const fmtIndex = formatArgIndex[m[1]] ?? 0;
  return variants.map((v) => ({ key: v.key, stmt: `${m[1]}(${inlineLiteralArgs(v.args, fmtIndex).join(", ")});` }));
}

/** Substitute string-literal %s arguments into the format literal. */
function inlineLiteralArgs(args, fmtIndex) {
  const fmt = literalValue(args[fmtIndex] ?? "");
  if (fmt === null) return args;
  const rest = args.slice(fmtIndex + 1);
  const kept = [];
  let argIndex = 0;
  const inlined = fmt.replace(conversionRe, (token, _width, spec) => {
    if (spec === "%") return token;
    const arg = rest[argIndex++];
    const value = spec === "s" && arg !== undefined ? literalValue(arg) : null;
    if (value === null) {
      if (arg !== undefined) kept.push(arg);
      return token;
    }
    return value.replace(/%/g, "%%");
  });
  const encoded = `"${inlined.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  return [...args.slice(0, fmtIndex), encoded, ...kept, ...rest.slice(argIndex)];
}

function addPair(enStmt, jaStmt) {
  const enVariants = callVariants(enStmt);
  const jaVariants = callVariants(jaStmt);
  if (enVariants.length === 1 && jaVariants.length === 1) {
    addSinglePair(enStmt, jaStmt);
    return;
  }
  const jaByKey = new Map(jaVariants.map((v) => [v.key, v.stmt]));
  for (const variant of enVariants) {
    const ja = jaByKey.get(variant.key);
    if (ja) addSinglePair(variant.stmt, ja);
  }
}

function addSinglePair(enStmt, jaStmt) {
  const en = findCall(enStmt);
  const ja = findCall(jaStmt);
  if (!en || !ja) return;
  pairCount += 1;
  const enFmt = parseFormat(en.fmt);
  const jaFmt = parseFormat(ja.fmt);
  if (!enFmt || !jaFmt) return;
  if (enFmt.specs.length !== en.args.length || jaFmt.specs.length !== ja.args.length) return;
  // Map each Japanese placeholder to an English placeholder by argument expression.
  const mapping = [];
  for (let i = 0; i < ja.args.length; i += 1) {
    let index = en.args.indexOf(ja.args[i]);
    if (index < 0) {
      // JNetHack often wraps arguments (e.g. jpast(x)); fall back to a contained match.
      index = en.args.findIndex(
        (arg) => arg.length > 2 && (ja.args[i].includes(arg) || (ja.args[i].length > 2 && arg.includes(ja.args[i]))),
      );
      if (index < 0) return;
      mapping.push({ index, transform: "raw" });
      continue;
    }
    mapping.push({ index, transform: "translate" });
  }
  // A Japanese text that ignores the English %s arguments was written for one
  // specific case (e.g. "You finish %s." -> one fixed verb); skip it.
  // Exception: body_part() arguments, which JNetHack often folds into the text.
  if (
    enFmt.specs.includes("s") &&
    mapping.length === 0 &&
    !en.args.every((arg) => /^(?:makeplural\()?body_part\(|^[Ss]omething$/.test(arg))
  ) {
    return;
  }
  const [enPrefix, jaPrefix] = outputFunctions[en.fn];
  const [, jaPrefixForJa] = outputFunctions[ja.fn] ?? ["", ""];
  const enSuffix = suffixes[en.fn]?.[0] ?? "";
  const jaSuffix = suffixes[ja.fn]?.[1] ?? "";
  const englishParts = [...enFmt.parts];
  englishParts[0] = enPrefix + (englishParts[0] ?? "");
  englishParts[englishParts.length - 1] += enSuffix;
  const literalText = englishParts.filter((p) => typeof p === "string").join("");
  if (literalText.replace(/[^A-Za-z]/g, "").length < 4) return;
  // Formats such as "Your %s %s." are too generic to identify a message.
  const fillerWords = new Set(["you", "your", "the", "an", "of", "is", "are", "and", "to", "in", "on"]);
  const literalWords = (literalText.match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !fillerWords.has(w.toLowerCase()));
  if (enFmt.specs.length >= 2 && literalWords.length < 1) return;

  const japaneseParts = [...jaFmt.parts];
  japaneseParts[0] = (ja.fn === en.fn ? jaPrefix : jaPrefixForJa) + (japaneseParts[0] ?? "");
  japaneseParts[japaneseParts.length - 1] += jaSuffix;

  // Template encoding: english uses "\u0000" + spec letter as placeholder;
  // japanese uses "{n}" referring to english placeholder n (0-based).
  let enTemplate = "";
  let specIndex = 0;
  for (const p of englishParts) {
    if (p === null) enTemplate += `\u0000${enFmt.specs[specIndex++]}`;
    else enTemplate += p;
  }
  let jaTemplate = "";
  let jaIndex = 0;
  for (const p of japaneseParts) {
    if (p === null) {
      const map = mapping[jaIndex++];
      jaTemplate += map.transform === "raw" ? `{${map.index}!}` : `{${map.index}}`;
    } else {
      jaTemplate += p.replace(/[{}]/g, (c) => (c === "{" ? "{{" : "}}"));
    }
  }
  if (enTemplate.includes("\n") || jaTemplate.includes("\n")) return;
  // Require some actual Japanese text besides placeholders and punctuation.
  if (!/[\u3040-\u30ff\u4e00-\u9fff]/.test(jaTemplate.replace(/\{\d+!?\}/g, ""))) return;
  if (!templates.has(enTemplate)) templates.set(enTemplate, jaTemplate);
}

function statementAt(text, start) {
  // read until first top-level ';' (respecting strings/parens)
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) j += text[j] === "\\" ? 2 : 1;
      i = j;
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === ";" && depth <= 0) return text.slice(start, i + 1);
  }
  return text.slice(start);
}

for (const dir of ["src", "japanese"]) {
  const base = path.join(jnhDir, dir);
  for (const name of fs.readdirSync(base)) {
    if (!name.endsWith(".c")) continue;
    const src = fs.readFileSync(path.join(base, name), "utf8");
    // Pattern A: /*JP <english> */ <japanese statement>
    for (const m of src.matchAll(/\/\*JP\s*\n([\s\S]*?)\*\/\s*\n/g)) {
      const english = m[1];
      if (english.includes("/*")) continue;
      const after = src.slice(m.index + m[0].length);
      const japanese = statementAt(after, 0);
      addPair(english, japanese);
      addEnlightenmentPair(english, japanese);
    }
    // Pattern B: #if 0 /*JP...*/ <english> #else <japanese> #endif
    // The English part must not cross another preprocessor line, otherwise an
    // #if 0 without #else would swallow the following block.
    const blockRe = /#\s*if 0 \/\*JP[^\n]*\n((?:(?!\n\s*#\s*(?:if|else|endif|elif))[\s\S])*?)\n\s*#\s*else[^\n]*\n((?:(?!\n\s*#\s*(?:if|else|endif|elif))[\s\S])*?)\n\s*#\s*endif/g;
    for (const m of src.matchAll(blockRe)) {
      if (/#\s*if/.test(m[1]) || /#\s*if/.test(m[2])) continue;
      const enStmts = stripComments(m[1]).split(/;\s*\n/);
      const jaStmts = stripComments(m[2]).split(/;\s*\n/);
      addLiteralListPairs(m[1], m[2]);
      if (enStmts.length !== jaStmts.length) continue;
      enStmts.forEach((stmt, i) => {
        addPair(`${stmt};`, `${jaStmts[i]};`);
        addEnlightenmentPair(stmt, jaStmts[i]);
      });
    }
  }
}

const output = {
  source: "JNetHack (https://github.com/jnethack/jnethack-alpha), NetHack General Public License",
  monsters,
  objects,
  features,
  dungeons,
  roleNames,
  bodyParts,
  questTexts,
  enlightenment,
  templates: Object.fromEntries(templates),
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(output, null, 0)}\n`);
console.log(
  `monsters: ${Object.keys(monsters).length}, objects: ${Object.values(objects).reduce((n, t) => n + Object.keys(t).length, 0)}, ` +
    `features: ${Object.keys(features).length}, dungeons: ${Object.keys(dungeons).length}, ` +
    `roleNames: ${Object.keys(roleNames).length}, quest texts: ${questTexts.length}, ` +
    `enlightenment: ${Object.keys(enlightenment).length}, ` +
    `pairs: ${pairCount}, templates: ${templates.size}`,
);
