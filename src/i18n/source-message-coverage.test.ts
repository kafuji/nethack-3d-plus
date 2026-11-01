// Opt-in audit: lists NetHack source messages still displayed in English.
//   node scripts/i18n/extract-source-messages.mjs <NetHack>/src samples.json
//   NH_MESSAGE_SAMPLES=samples.json npx vitest run src/i18n/source-message-coverage.test.ts
// Writes <samples>-untranslated.tsv next to the input (location, format, samples).
import { expect, it, vi } from "vitest";
import { setCurrentLocale } from "./core";

// Vitest exposes the process environment as import.meta.env.
const samplesFile = (import.meta.env as Record<string, string | undefined>).NH_MESSAGE_SAMPLES;

/** Shown in English: no Japanese, or two or more English words in a row. */
function isUntranslated(text: string): boolean {
  return !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)
    || /[A-Za-z]{2,}[,.!?']*(?: +[A-Za-z][A-Za-z'.,!?-]*)+/.test(text.replace(/KAABLAMM|Kaablamm/g, ""));
}

it.skipIf(!samplesFile)("reports source messages without a Japanese rendering", async () => {
  const { readFileSync, writeFileSync } = await vi.importActual<{
    readFileSync: (path: string, encoding: "utf8") => string;
    writeFileSync: (path: string, data: string) => void;
  }>("node:fs");
  setCurrentLocale("ja");
  const gameText = await import("../plus/game-text/index");
  gameText.ensureGameTextTranslatorLoaded();
  // Let the lazily imported JNetHack dictionary finish loading.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const { presentGameMessage } = await import("./message-presentation");
  const entries = JSON.parse(readFileSync(samplesFile!, "utf8")) as {
    file: string; line: number; format: string; samples: string[];
  }[];
  const report: string[] = [];
  for (const entry of entries) {
    const results = entry.samples.map((sample) => [sample, presentGameMessage(sample, "ja").text] as const);
    if (results.some(([, ja]) => !isUntranslated(ja))) continue;
    report.push(`${entry.file}:${entry.line}\t${entry.format}\t${results.map(([en, ja]) => (ja === en ? en : `${en} => ${ja}`)).join(" || ")}`);
  }
  writeFileSync(samplesFile!.replace(/\.json$/, "") + "-untranslated.tsv", report.join("\n"));
  console.log(`${report.length} of ${entries.length} source formats have no Japanese sample`);
  expect(entries.length).toBeGreaterThan(0);
}, 600000);
