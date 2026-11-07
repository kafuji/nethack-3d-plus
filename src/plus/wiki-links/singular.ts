// English singular forms of a plural noun phrase, for matching names.

const irregularPlurals: Readonly<Record<string, string>> = {
  teeth: "tooth",
  feet: "foot",
  knives: "knife",
  staves: "staff",
  mice: "mouse",
  lice: "louse",
  geese: "goose",
  men: "man",
  women: "woman",
  dwarves: "dwarf",
  elves: "elf",
  wolves: "wolf",
  thieves: "thief",
  leaves: "leaf",
  loaves: "loaf",
  oxen: "ox",
  children: "child",
  "gold pieces": "gold piece",
  vortices: "vortex",
  matzot: "matzo",
  homunculi: "homunculus",
  fungi: "fungus",
  djinn: "djinni",
  cyclopes: "cyclops",
};
Object.setPrototypeOf(irregularPlurals, null);

/** Candidate singular forms for an English noun phrase (plural last word). */
export function singularCandidates(name: string): string[] {
  const candidates = [name];
  const irregular = irregularPlurals[name];
  if (irregular) candidates.push(irregular);
  // "pairs of X", "potions of X": singularize the head word before " of ".
  const ofIndex = name.indexOf(" of ");
  const head = ofIndex > 0 ? name.slice(0, ofIndex) : name;
  const tail = ofIndex > 0 ? name.slice(ofIndex) : "";
  const words = head.split(" ");
  const last = words[words.length - 1] ?? "";
  const forms: string[] = [];
  const irregularLast = irregularPlurals[last];
  if (irregularLast) forms.push(irregularLast);
  if (/[^aeiou]ies$/.test(last)) forms.push(`${last.slice(0, -3)}y`);
  if (/(?:s|x|z|ch|sh)es$/.test(last)) forms.push(last.slice(0, -2));
  if (/ves$/.test(last)) forms.push(`${last.slice(0, -3)}f`, `${last.slice(0, -3)}fe`);
  if (/s$/.test(last) && !/ss$/.test(last)) forms.push(last.slice(0, -1));
  for (const form of forms) {
    candidates.push([...words.slice(0, -1), form].join(" ") + tail);
  }
  return candidates;
}
