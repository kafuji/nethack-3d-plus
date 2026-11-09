// Opt-in audit: lists NetHack source messages still displayed in English.
//   node scripts/i18n/extract-source-messages.mjs <NetHack>/src samples.json
//   NH_MESSAGE_SAMPLES=samples.json npx vitest run src/i18n/source-message-coverage.test.ts
// Writes <samples>-untranslated.tsv next to the input (location, format, samples).
// Each form of a message (one per choice of its literal arguments) must have
// a Japanese sample; Sprintf() text may also be a prompt or a window line.
import { expect, it, vi } from "vitest";
import { setCurrentLocale } from "./core";

// Vitest exposes the process environment as import.meta.env.
const samplesFile = (import.meta.env as Record<string, string | undefined>).NH_MESSAGE_SAMPLES;

/** Shown in English: no Japanese, or any English word kept apart from the sample's arguments. */
function isUntranslated(text: string): boolean {
  return !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)
    || /[A-Za-z]{3,}/.test(text.replace(/KAABLAMM|Kaablamm|Anhur|Agent|Asidonhopo|NetHack|#\w+/g, ""));
}

it.skipIf(!samplesFile)("reports source messages without a Japanese rendering", async () => {
  const { readFileSync, writeFileSync } = await vi.importActual<{
    readFileSync: (path: string, encoding: "utf8") => string;
    writeFileSync: (path: string, data: string) => void;
  }>("node:fs");
  setCurrentLocale("ja");
  const { presentGameMessage } = await import("./message-presentation");
  const { translateGamePrompt } = await import("./game-prompts");
  const { translateGameMenuItem } = await import("./game-menu");
  const { translateReportLine } = await import("./report-text");
  const entries = JSON.parse(readFileSync(samplesFile!, "utf8")) as {
    file: string; line: number; call?: string; format: string; samples: string[]; groups?: string[][]; forms?: string[];
  }[];
  const report: string[] = [];
  for (const entry of entries) {
    const assembled = entry.call === "Sprintf" || entry.call === "Snprintf";
    const render = (sample: string): string => {
      const message = presentGameMessage(sample, "ja").text;
      if (!assembled || !isUntranslated(message)) return message;
      return [translateGamePrompt(sample, "ja"), translateReportLine(sample, "ja"), translateGameMenuItem(sample, "", "ja")]
        .find((text) => !isUntranslated(text)) ?? message;
    };
    const groups = entry.groups ?? [entry.samples];
    const failingForms = groups
      .map((group, index) => ({ form: entry.forms?.[index] ?? entry.format, results: group.map((sample) => [sample, render(sample)] as const) }))
      .filter(({ results }) => !results.some(([, ja]) => !isUntranslated(ja)));
    if (!failingForms.length) continue;
    const failing = failingForms.map(({ results }) => results);
    // Columns: location, format, failing samples, and the failing forms (dictionary keys to add).
    report.push(`${entry.file}:${entry.line}\t${entry.format}\t${failing.flat().map(([en, ja]) => (ja === en ? en : `${en} => ${ja}`)).join(" || ")}\t${failingForms.map(({ form }) => form).join(" || ")}`
      .replace(/\n/g, "\\n"));
  }
  writeFileSync(samplesFile!.replace(/\.json$/, "") + "-untranslated.tsv", report.join("\n"));
  console.info(`${report.length} of ${entries.length} source formats have a form without a Japanese sample`);
  expect(entries.length).toBeGreaterThan(0);
}, 600000);
