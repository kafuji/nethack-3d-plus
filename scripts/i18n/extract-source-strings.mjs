// Extracts every string a player might read from NetHack's C and Lua sources,
// including what extract-source-messages.mjs cannot see: Lua des.message() and
// nh.pline(), menu text, table entries and the fragments Sprintf assembles.
// Usage: node scripts/i18n/extract-source-strings.mjs <NetHack source dir> <out.json>
// Pass the result to src/i18n/source-string-coverage.test.ts, then review the report.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [root, outFile] = process.argv.slice(2);
if (!root || !outFile) throw new Error("Pass the NetHack source directory and an output file.");

// Calls whose strings never reach the player.
const hiddenCalls = new Set([
  "impossible", "panic", "paniclog", "debugpline", "debugpline0", "debugpline1", "debugpline2", "debugpline3", "debugpline4",
  "raw_print", "raw_printf", "raw_print_bold", "config_error_add", "sanity_check_msg", "wait_synch", "fopen", "freopen", "fprintf", "printf",
  "strcmp", "strcmpi", "strncmp", "strncmpi", "strstr", "strstri", "strsubst", "strchr", "index", "fuzzymatch", "wildmatch", "sscanf", "getenv",
  "nhl_error", "luaL_error", "lua_getglobal", "lua_setglobal", "lua_pushstring", "lua_getfield", "lua_setfield", "luaL_loadstring",
  "get_table_str", "get_table_str_opt", "get_table_int", "get_table_int_opt", "get_table_boolean", "get_table_boolean_opt", "nhl_add_table_entry_str",
  "dlb_fopen", "nhUse", "assert", "defined", "fatal", "sfi_char", "sfo_char", "Lua_error", "lregister", "nh_snprintf", "fmt_ptr", "dump_fmtstr",
]);
// Files with no game text: option parsing, save format, scripting glue, map compilers.
const hiddenFiles = new Set([
  "cfgfiles.c", "dlb.c", "mdlib.c", "nhlua.c", "nhlobj.c", "nhlsel.c", "sfbase.c", "sfstruct.c", "isaac64.c", "rnd.c", "hacklib.c", "alloc.c",
  "date.c", "version.c", "coloratt.c", "selvar.c", "strutil.c", "nhmd4.c", "report.c", "sfexpasc.c", "sfctool.c", "sfdata.c", "windows.c", "wizcmds.c",
]);

function stripComments(src, lua) {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else if (!lua && ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      out += src.slice(i, end < 0 ? src.length : end + 2).replace(/[^\n]/g, " ");
      i = end < 0 ? src.length : end + 1;
    } else if ((!lua && ch === "/" && src[i + 1] === "/") || (lua && ch === "-" && src[i + 1] === "-")) {
      const end = src.indexOf("\n", i);
      i = end < 0 ? src.length : end - 1;
    } else out += ch;
  }
  return out;
}

/** The function whose argument list encloses the position, if any. */
function enclosingCall(src, at) {
  let depth = 0;
  for (let i = at - 1; i >= Math.max(0, at - 4000); i--) {
    const ch = src[i];
    if (ch === '"') {
      i--;
      while (i > 0 && (src[i] !== '"' || src[i - 1] === "\\")) i--;
    } else if (ch === ")") depth++;
    else if (ch === "(") {
      if (depth === 0) return /([A-Za-z_][\w.]*)\s*$/.exec(src.slice(Math.max(0, i - 40), i))?.[1];
      depth--;
    } else if (ch === ";" || ch === "{" || ch === "}") return undefined;
  }
  return undefined;
}

const unescape = (text) => text.replace(/\\(["'\\])/g, "$1").replace(/\\n/g, "\n").replace(/\\t/g, " ").replace(/\\[0-7]{1,3}/g, "");

// A word, then another word or sentence punctuation: prose rather than an identifier.
const looksLikeProse = (text) => /[A-Za-z]{2}/.test(text)
  && (/[A-Za-z%][A-Za-z%,'-]*\s+[A-Za-z%]/.test(text) || /[A-Za-z][.!?]\s*$/.test(text));
// Paths, option assignments, format-only strings and similar.
const looksLikeData = (text) => /^[\s%]*$/.test(text) || /^[-\w./\\]+$/.test(text) || /[\\/][\w.-]+[\\/]/.test(text)
  || /^%[-\d.*]*[a-z]+\s*$/.test(text) || /^[A-Z_]+[:=]/.test(text);

// Menu text is shown as it is, so even a single word counts.
const menuCalls = new Set(["add_menu", "add_menu_str", "add_menu_heading", "end_menu", "ia_addmenu", "mcmd_addmenu"]);

const entries = new Map();
function add(file, line, text, kind, call) {
  const key = text.trim();
  if ((!looksLikeProse(key) && !menuCalls.has(call)) || looksLikeData(key)) return;
  const known = entries.get(key);
  if (known) known.at.push(`${file}:${line}`);
  else entries.set(key, { text: key, kind, call, at: [`${file}:${line}`] });
}

for (const file of readdirSync(path.join(root, "src")).filter((name) => name.endsWith(".c") && !hiddenFiles.has(name))) {
  const src = stripComments(readFileSync(path.join(root, "src", file), "latin1"), false);
  const lines = src.split("\n");
  let offset = 0;
  const hiddenLine = lines.map((line) => /^\s*#\s*(?:include|pragma|error)/.test(line));
  // Adjacent literals are one string in C.
  for (const match of src.matchAll(/"(?:[^"\\\n]|\\.)*"(?:\s*"(?:[^"\\\n]|\\.)*")*/g)) {
    const line = src.slice(offset, match.index).split("\n").length - 1;
    void line;
    const number = src.slice(0, match.index).split("\n").length;
    if (hiddenLine[number - 1]) continue;
    const call = enclosingCall(src, match.index);
    if (call && hiddenCalls.has(call)) continue;
    const text = [...match[0].matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map((part) => unescape(part[1])).join("");
    add(file, number, text, "c", call);
  }
}

for (const file of readdirSync(path.join(root, "dat")).filter((name) => name.endsWith(".lua"))) {
  // quest.lua is translated as whole documents by the game-text tier.
  const src = stripComments(readFileSync(path.join(root, "dat", file), "latin1"), true);
  for (const match of src.matchAll(/\b(des\.message|nh\.pline|nh\.verbalize|nh\.text|nh\.message)\s*\(\s*(?:"((?:[^"\\\n]|\\.)*)"|\[\[([\s\S]*?)\]\])/g)) {
    add(file, src.slice(0, match.index).split("\n").length, unescape(match[2] ?? match[3]), "lua");
  }
  // Tutorial and hint strings passed by name, e.g. { text = "..." }.
  for (const match of src.matchAll(/\b(?:text|msg|message|desc|prompt|title)\s*=\s*"((?:[^"\\\n]|\\.)*)"/g)) {
    add(file, src.slice(0, match.index).split("\n").length, unescape(match[1]), "lua");
  }
}

const list = [...entries.values()].sort((a, b) => a.at[0].localeCompare(b.at[0], "en", { numeric: true }));
writeFileSync(outFile, JSON.stringify(list, null, 0));
console.log(`${list.length} strings (${list.filter((entry) => entry.kind === "lua").length} from Lua)`);
