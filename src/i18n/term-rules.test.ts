// Keeps one spelling per term in the translations. The reference translations
// are converted when shown (withProjectTerms).
import { describe, expect, it, vi } from "vitest";
import { termRules, withProjectTerms } from "./term-rules";

interface Fs {
  readFileSync: (path: string, encoding: "utf8") => string;
  readdirSync: (path: string) => string[];
  statSync: (path: string) => { isDirectory: () => boolean };
}

// Translated prose about the real world (Buddhist temples, a statue's 彫像)
// and texts quoted as written are left as they are.
const skipped = /\.test\.ts$|__scratch|term-rules\.ts$|nehww|NEHWW|imported-|encyclopedia|help-history|engravings|README|locales[\\/](?!ja\.ts)/;
const japanesePair = /"((?:[^"\\]|\\.)+)"\s*:\s*"((?:[^"\\]|\\.)*[぀-ヿ一-鿿](?:[^"\\]|\\.)*)"/g;

async function curatedFiles(): Promise<{ path: string; text: string }[]> {
  const fs = await vi.importActual<Fs>("node:fs");
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of fs.readdirSync(dir)) {
      const path = `${dir}/${name}`;
      if (fs.statSync(path).isDirectory()) walk(path, out);
      else out.push(path);
    }
    return out;
  };
  return [...walk("src/i18n"), "src/plus/i18n/ja.ts"]
    .filter((path) => /\.(ts|json|txt|tsv)$/.test(path) && !skipped.test(path))
    .map((path) => ({ path, text: fs.readFileSync(path, "utf8") }));
}

describe("project terms", () => {
  it("curated translations use one spelling for each term", async () => {
    const found: string[] = [];
    for (const { path, text } of await curatedFiles()) {
      for (const [pattern, term, context] of termRules) {
        if (context) continue;
        for (const match of text.matchAll(new RegExp(pattern.source, "g"))) {
          const at = match.index ?? 0;
          found.push(`${path}: ${match[0]} -> ${typeof term === "string" ? term : term(match[0])} in ${text.slice(Math.max(0, at - 20), at + 20).replace(/\s+/g, " ")}`);
        }
      }
      // Rules that depend on the English apply to "English": "Japanese" pairs.
      for (const [, english, japanese] of text.matchAll(japanesePair)) {
        const fixed = withProjectTerms(japanese, english);
        if (fixed !== japanese) found.push(`${path}: "${english}" -> ${fixed}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("brings reference wording to the project's terms", () => {
    expect(withProjectTerms("熊の罠にかかった．", "You are caught in a bear trap.")).toBe("トラバサミにかかった。");
    expect(withProjectTerms("ドカーン!!! 地雷を踏んでしまった！")).toBe("ドカーン！！！ 地雷を踏んでしまった！");
    expect(withProjectTerms("迷宮の奥", "the maze")).toBe("迷宮の奥");
    expect(withProjectTerms("迷宮の奥", "deep in the dungeon")).toBe("ダンジョンの奥");
  });
});
