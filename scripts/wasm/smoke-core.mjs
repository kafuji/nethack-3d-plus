// Starts a game on a built core in Node and reports which window callbacks it
// reached. Answers every prompt with a fixed default, so it only proves that
// the core boots, selects a character and begins drawing the map.
//
// Usage: node scripts/wasm/smoke-core.mjs <dir with nethack.js + nethack.wasm>
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_CALLBACKS = 500;
const TIMEOUT_MS = 20000;
const REQUIRED_CALLBACKS = [
  "shim_init_nhwindows",
  "shim_player_selection_cb",
  "shim_print_glyph",
  "shim_status_update",
];
const CALLBACK_RESULTS = {
  shim_player_selection_cb: false,
  shim_create_nhwindow: 1,
  shim_nhgetch: 32,
  shim_nh_poskey: 32,
  shim_yn_function: 121,
  shim_getmsghistory: "",
  shim_get_ext_cmd: -1,
};

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node scripts/wasm/smoke-core.mjs <built-core-dir>");
  process.exit(2);
}
const stem = existsSync(resolve(dir, "nethack.js")) ? "nethack" : "nethack-5";
const jsPath = resolve(dir, `${stem}.js`);
const wasmPath = resolve(dir, `${stem}.wasm`);

const seen = new Set();
let callbackCount = 0;
let error = null;

function finish() {
  const callbackNames = [...seen].sort();
  const missing = REQUIRED_CALLBACKS.filter((name) => !seen.has(name));
  console.log(JSON.stringify({ callbackCount, callbackNames, error, missing }, null, 2));
  process.exit(error || missing.length > 0 ? 1 : 0);
}

const { default: createModule } = await import(pathToFileURL(jsPath).href);
const Module = await createModule({
  noInitialRun: true,
  wasmBinary: readFileSync(wasmPath),
  print: () => {},
  printErr: () => {},
});

globalThis.nethackGlobal = globalThis.nethackGlobal || {};
globalThis.nethackCallback = async (name) => {
  callbackCount += 1;
  seen.add(name);
  if (callbackCount >= MAX_CALLBACKS) finish();
  return CALLBACK_RESULTS[name] ?? 0;
};

Module.cwrap("shim_graphics_set_callback", null, ["string"])("nethackCallback");
setTimeout(finish, TIMEOUT_MS);

try {
  Module._main(0, 0);
} catch (cause) {
  error = `main() threw: ${cause?.message || cause}`;
  finish();
}
