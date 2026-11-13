import fs from "node:fs/promises";
import path from "node:path";
import {
  generateGlyphCatalogSource,
  getGeneratedCatalogPathForVersion,
  getGlyphCatalogTargets,
  resolveProjectRoot,
} from "./catalog-generator.mjs";

// Optional arguments name the versions to regenerate (for example `5.0`);
// with none, every catalog is regenerated in one process, which stalls when
// the 3.6.7 runtime starts after another one.
async function main() {
  const projectRoot = resolveProjectRoot();
  const requested = process.argv.slice(2);
  const targets = getGlyphCatalogTargets().filter(
    (target) => requested.length === 0 || requested.includes(target.version),
  );
  if (targets.length === 0) {
    throw new Error(`No glyph catalog for: ${requested.join(", ")}`);
  }
  for (const target of targets) {
    const outputPath = getGeneratedCatalogPathForVersion(
      projectRoot,
      target.version,
    );
    const source = await generateGlyphCatalogSource(projectRoot, target.version);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, source, "utf8");
    console.log(`Generated glyph catalog (${target.version}): ${outputPath}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
