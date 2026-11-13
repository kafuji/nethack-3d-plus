// Checks whether a save written by one core build loads in another, in Node,
// without the client. One mode per process: a second game in the same process
// breaks Asyncify.
//
//   node scripts/wasm/save-compat-core.mjs save    <core-dir> <save-dir>
//     starts a new game, searches a few turns, saves, and copies the core's
//     /save directory to <save-dir>.
//   node scripts/wasm/save-compat-core.mjs restore <core-dir> <save-dir>
//     seeds /save from <save-dir>, starts the same character, and passes only
//     if the game greets it with "welcome back" (a new game says "welcome to").
//
// <core-dir> holds nethack.js + nethack.wasm, or the public/ names nethack-5.*.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [mode, coreDir, saveDir] = process.argv.slice(2);
if (!["save", "restore"].includes(mode) || !coreDir || !saveDir) {
  console.error("Usage: node scripts/wasm/save-compat-core.mjs <save|restore> <core-dir> <save-dir>");
  process.exit(2);
}

const TIMEOUT_MS = 30000;
const OPTIONS =
  "name:Compat,role:Valkyrie,race:human,gender:female,align:neutral," +
  "!autopickup,pettype:none,!legacy,!tutorial,!splash_screen,windowtype:shim";
const stem = existsSync(resolve(coreDir, "nethack.js")) ? "nethack" : "nethack-5";
const jsPath = resolve(coreDir, `${stem}.js`);
const wasmPath = resolve(coreDir, `${stem}.wasm`);

const texts = [];
const keys = mode === "save" ? ["s", "s", "s", "S"] : [];
let mod;
let savedFiles = [];
let done = false;

function listSaveFiles() {
  try {
    return mod.FS.readdir("/save").filter((name) => name !== "." && name !== "..");
  } catch {
    return [];
  }
}

function finish(reason) {
  if (done) return;
  done = true;
  const greeting = texts.find((text) => /welcome (back )?to NetHack/.test(text)) ?? null;
  const restored = /welcome back to NetHack/.test(greeting ?? "");
  const problems = texts.filter((text) =>
    /not yours|version|incompatible|corrupt|cannot|can't|couldn't|error|panic/i.test(text),
  );
  const ok = mode === "save" ? savedFiles.length > 0 : restored;
  console.log(
    JSON.stringify({ mode, core: wasmPath, reason, ok, greeting, savedFiles, problems }, null, 2),
  );
  process.exit(ok ? 0 : 1);
}

// The main loop asks for a key only once the game is running; in restore mode
// that is all there is to wait for.
function nextKey() {
  if (keys.length > 0) return keys.shift().charCodeAt(0);
  if (mode === "restore") finish("reached the command loop");
  return 27;
}

globalThis.nethackGlobal = globalThis.nethackGlobal ?? {
  helpers: {},
  constants: {},
  globals: {},
  pointers: {},
};
globalThis.nethackCallback = async (name, ...args) => {
  switch (name) {
    case "shim_putstr":
      if (typeof args[2] === "string") texts.push(args[2]);
      return 0;
    case "shim_raw_print":
    case "shim_raw_print_bold":
      if (typeof args[0] === "string") texts.push(args[0]);
      return 0;
    case "shim_create_nhwindow":
      return 1;
    case "shim_yn_function": {
      const question = String(args[0] ?? "");
      texts.push(question);
      if (/Really save/i.test(question)) return "y".charCodeAt(0);
      return typeof args[2] === "number" && args[2] > 0 ? args[2] : "n".charCodeAt(0);
    }
    case "shim_getlin":
      mod.stringToUTF8("\u001b", args[1], 8);
      return 0;
    case "shim_nhgetch":
    case "shim_nh_poskey":
      await new Promise((resolveKey) => setImmediate(resolveKey));
      return nextKey();
    case "shim_get_ext_cmd":
      return -1;
    case "shim_getmsghistory":
    case "shim_get_color_string":
      return "";
    case "shim_player_selection_cb":
      return true;
    case "shim_exit_nhwindows":
      if (typeof args[0] === "string") texts.push(args[0]);
      if (mode === "save") {
        mkdirSync(saveDir, { recursive: true });
        savedFiles = listSaveFiles();
        for (const file of savedFiles) {
          writeFileSync(resolve(saveDir, file), mod.FS.readFile(`/save/${file}`));
        }
      }
      finish("the game exited");
      return 0;
    default:
      return 0;
  }
};

const { default: createModule } = await import(pathToFileURL(jsPath).href);
mod = await createModule({
  noInitialRun: true,
  locateFile: (file) => (file.endsWith(".wasm") ? wasmPath : file),
  print: () => {},
  printErr: () => {},
  preRun: [
    (m) => {
      m.ENV.NETHACKOPTIONS = OPTIONS;
      m.ENV.HACKDIR = "/";
      m.ENV.NETHACKDIR = "/";
      try {
        m.FS.mkdir("/save");
      } catch {
        // already there
      }
      if (mode === "restore") {
        for (const file of readdirSync(saveDir)) {
          m.FS.writeFile(`/save/${file}`, readFileSync(resolve(saveDir, file)));
        }
      }
    },
  ],
});
mod.FS.writeFile("/sysconf", "WIZARDS=*\nEXPLORERS=*\nCHECK_PLNAME=0\n");
mod.cwrap("shim_graphics_set_callback", null, ["string"])("nethackCallback");
setTimeout(() => finish("timed out"), TIMEOUT_MS);

const program = mod._malloc(16);
mod.stringToUTF8("nethack", program, 16);
const argv = mod._malloc(8);
mod.setValue(argv, program, "*");
mod.setValue(argv + 4, 0, "*");
try {
  mod._main(1, argv);
} catch (cause) {
  texts.push(`main() threw: ${cause?.message || cause}`);
}
