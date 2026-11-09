// Finds wiki-linkable names in a message. Names are recognized in the English
// runtime text and only then located in the translated display text, so a short
// Japanese word never becomes a link unless the original message named it.
import { singularCandidates } from "./singular";

export interface WikiNameSources {
  /** Monster names. */
  readonly monsters: Iterable<string>;
  /** Real item names; singular and plural spellings may both be listed. */
  readonly items: Iterable<string>;
  /**
   * Randomized or generic appearances ("combat boots", "lamp"). They must not
   * link: their wiki pages can reveal what an unidentified item really is.
   */
  readonly appearances: Iterable<string>;
  /** Translations a name may appear as in display text. */
  readonly displayNames: (name: string) => readonly string[];
}

export interface WikiTextSegment {
  readonly text: string;
  /** Wiki article title, when this part of the text is a link. */
  readonly article?: string;
}

interface WikiNameSpan {
  readonly start: number;
  readonly end: number;
  readonly name: string;
  readonly article: string;
}

type WikiNameEntry = { readonly name: string; readonly linked: boolean };

/** Visible classes: all an unidentified "ruby ring" reveals. */
const classNouns = ["potion", "scroll", "ring", "wand", "amulet", "spellbook", "gem", "stone"] as const;
const classWords: ReadonlySet<string> = new Set(classNouns.flatMap((noun) => [noun, `${noun}s`]));

const wordPattern = /[A-Za-z]+(?:-[A-Za-z]+)*/g;
const segmentCacheLimit = 500;

export function wikiArticleTitle(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export class WikiNameIndex {
  private readonly entries = new Map<string, WikiNameEntry>();
  private readonly maxWords: number;
  private readonly segmentCache = new Map<string, readonly WikiTextSegment[]>();

  constructor(private readonly sources: WikiNameSources) {
    for (const monster of sources.monsters) this.entries.set(monster, { name: monster, linked: true });
    const items = new Set(sources.items);
    for (const item of items) {
      const singular = singularCandidates(item).slice(1).find((candidate) => items.has(candidate));
      this.entries.set(item, { name: singular ?? item, linked: true });
    }
    // Later tables win: an appearance overrides a like-named item, and a class
    // noun overrides the appearance table's entry for it.
    for (const appearance of sources.appearances) this.entries.set(appearance, { name: appearance, linked: false });
    for (const noun of classNouns) this.entries.set(noun, { name: noun, linked: true });
    let maxWords = 1;
    for (const key of this.entries.keys()) maxWords = Math.max(maxWords, key.split(" ").length);
    this.maxWords = maxWords;
  }

  /** Split display text into plain and linked parts. */
  segments(english: string, display: string): readonly WikiTextSegment[] {
    const key = `${english}\0${display}`;
    const cached = this.segmentCache.get(key);
    if (cached) return cached;
    const found = this.scan(english);
    const spans = display === english ? found : this.locate(display, found, english);
    const segments = toSegments(display, spans);
    if (this.segmentCache.size >= segmentCacheLimit) this.segmentCache.clear();
    this.segmentCache.set(key, segments);
    return segments;
  }

  /** Longest-match scan of the English text. */
  private scan(text: string): WikiNameSpan[] {
    const words = [...text.matchAll(wordPattern)].map((match) => ({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    }));
    const spans: WikiNameSpan[] = [];
    for (let first = 0; first < words.length;) {
      let consumed = 1;
      for (let count = Math.min(this.maxWords, words.length - first); count >= 1; count -= 1) {
        const last = first + count - 1;
        // Names are single-space phrases; punctuation ends one.
        if (words[last]!.start - words[first]!.start !== wordsLength(words, first, last)) continue;
        const start = words[first]!.start;
        const end = words[last]!.end;
        const entry = this.lookup(text.slice(start, end));
        if (!entry) continue;
        const next = words[last + 1];
        // "ruby ring" is a ring's appearance, not the gem.
        const isAppearanceWord = !classWords.has(entry.name)
          && next !== undefined && next.start === end + 1 && classWords.has(next.word.toLowerCase());
        if (isAppearanceWord) continue;
        consumed = count;
        if (entry.linked) spans.push({ start, end, name: entry.name, article: wikiArticleTitle(entry.name) });
        break;
      }
      first += consumed;
    }
    return spans;
  }

  private lookup(phrase: string): WikiNameEntry | undefined {
    // Capitalized names match exactly: "stings" must not become the sword Sting.
    // Only a lowercase name may be capitalized, at the start of a sentence.
    const uncapitalized = phrase.charAt(0).toLowerCase() + phrase.slice(1);
    const forms = uncapitalized === phrase ? [phrase] : [phrase, uncapitalized];
    for (const form of forms) {
      for (const candidate of singularCandidates(form)) {
        const entry = this.entries.get(candidate);
        if (entry) return entry;
      }
    }
    return undefined;
  }

  /** Find the names of `found` in translated text, longest translation first. */
  private locate(display: string, found: readonly WikiNameSpan[], english: string): WikiNameSpan[] {
    const candidates = new Map<string, WikiNameSpan>();
    for (const span of found) {
      candidates.set(english.slice(span.start, span.end), span);
      for (const name of this.sources.displayNames(span.name)) {
        if (name && !candidates.has(name)) candidates.set(name, span);
      }
    }
    const ordered = [...candidates.entries()].sort(([a], [b]) => b.length - a.length);
    const spans: WikiNameSpan[] = [];
    for (const [text, span] of ordered) {
      for (let start = display.indexOf(text); start >= 0; start = display.indexOf(text, start + text.length)) {
        const end = start + text.length;
        if (spans.some((other) => start < other.end && other.start < end)) continue;
        spans.push({ ...span, start, end });
      }
    }
    return spans.sort((a, b) => a.start - b.start);
  }
}

/** The length a phrase has when its words are separated by single spaces. */
function wordsLength(words: readonly { word: string; start: number; end: number }[], first: number, last: number): number {
  let length = 0;
  for (let index = first; index < last; index += 1) length += words[index]!.word.length + 1;
  return length;
}

function toSegments(display: string, spans: readonly WikiNameSpan[]): readonly WikiTextSegment[] {
  const segments: WikiTextSegment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) segments.push({ text: display.slice(cursor, span.start) });
    segments.push({ text: display.slice(span.start, span.end), article: span.article });
    cursor = span.end;
  }
  if (cursor < display.length) segments.push({ text: display.slice(cursor) });
  return segments;
}
