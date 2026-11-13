// Compares a freshly built NetHack core (nethack.js + nethack.wasm) with the
// artifacts checked in under public/. Emscripten minifies WASM import/export
// names at -O3, so the comparison is by count and by the glue's `_`-prefixed
// exports rather than by symbol name. Byte identity is reported but not
// required: it only holds when the Emscripten version matches.
//
// Usage: node scripts/wasm/compare-core-build.mjs <reference-dir> <built-dir>
//   each dir holds nethack.js and nethack.wasm (reference may use the
//   public/ names nethack-5.js / nethack-5.wasm).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function locate(dir) {
  for (const stem of ["nethack", "nethack-5"]) {
    const js = resolve(dir, `${stem}.js`);
    const wasm = resolve(dir, `${stem}.wasm`);
    if (existsSync(js) && existsSync(wasm)) return { js, wasm };
  }
  throw new Error(`No nethack.js/nethack.wasm pair in ${dir}`);
}

const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

async function describe(dir) {
  const { js, wasm } = locate(dir);
  const bytes = readFileSync(wasm);
  const module = new WebAssembly.Module(bytes);
  const { default: createModule } = await import(pathToFileURL(js).href);
  // locateFile rather than wasmBinary, so a build that dropped wasmBinary
  // still loads here and is reported below instead of crashing the comparison.
  const instance = await createModule({
    noInitialRun: true,
    locateFile: (path) => (path.endsWith(".wasm") ? wasm : path),
    print: () => {},
    printErr: () => {},
  });
  // Every `Module["x"]` the glue reads or writes: the options it accepts from
  // the caller plus what it exposes back.
  const moduleProperties = [
    ...new Set(
      [...readFileSync(js, "utf8").matchAll(/Module\["([A-Za-z_$][\w$]*)"\]/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
  return {
    moduleProperties,
    js,
    wasm,
    jsSha256: sha256(js),
    wasmSha256: sha256(wasm),
    wasmBytes: bytes.length,
    wasmExports: WebAssembly.Module.exports(module).length,
    wasmImports: WebAssembly.Module.imports(module).length,
    glueExports: Object.keys(instance)
      .filter((key) => key.startsWith("_") && typeof instance[key] === "function")
      .sort(),
  };
}

const [referenceDir, builtDir] = process.argv.slice(2);
if (!referenceDir || !builtDir) {
  console.error(
    "Usage: node scripts/wasm/compare-core-build.mjs <reference-dir> <built-dir>",
  );
  process.exit(2);
}

const reference = await describe(referenceDir);
const built = await describe(builtDir);

const missing = reference.glueExports.filter(
  (name) => !built.glueExports.includes(name),
);
const added = built.glueExports.filter(
  (name) => !reference.glueExports.includes(name),
);

// Dropped by newer Emscripten and not used by the client: calledRun was only
// logged, preloadPlugins belongs to the unused file packager.
const IGNORED_MODULE_PROPERTIES = new Set(["calledRun", "preloadPlugins"]);
const missingModuleProperties = reference.moduleProperties.filter(
  (name) =>
    !built.moduleProperties.includes(name) && !IGNORED_MODULE_PROPERTIES.has(name),
);
const summarize = ({ moduleProperties, ...rest }) => ({
  ...rest,
  modulePropertyCount: moduleProperties.length,
});

console.log(
  JSON.stringify(
    {
      reference: summarize(reference),
      built: summarize(built),
      missing,
      added,
      missingModuleProperties,
    },
    null,
    2,
  ),
);
console.log(
  reference.wasmSha256 === built.wasmSha256
    ? "WASM is byte-identical to the reference."
    : "WASM differs from the reference bytes (expected unless the Emscripten version matches).",
);

if (missing.length > 0) {
  console.error(`Built core is missing exports: ${missing.join(", ")}`);
}
if (missingModuleProperties.length > 0) {
  console.error(
    `Built glue no longer handles Module properties: ${missingModuleProperties.join(", ")}`,
  );
}
process.exit(missing.length > 0 || missingModuleProperties.length > 0 ? 1 : 0);
