# Unreviewed Nehww message translations and patterns

`nehww-messages.json` is a filtered subset of `dictionary.csv` from
[e3sh/Nethack-wasm-webUI](https://github.com/e3sh/Nethack-wasm-webUI), fixed at
commit `a0cd91eb157e102f033c1be475b9014a79850c89`. The source CSV SHA-256 is
`973650880dfbf16871b572855a23d385a0794043ed7c414317544b1d0c3d709c`.
The upstream [third-party notices](https://github.com/e3sh/Nethack-wasm-webUI/blob/a0cd91eb157e102f033c1be475b9014a79850c89/THIRD_PARTY_NOTICES.md)
identify its dictionary and translation data as MIT licensed. The upstream MIT
copyright notice and permission text are reproduced in `NEHWW-LICENSE.txt`.
The same notice is included in packaged web assets at
`public/licenses/nehww-dictionary-MIT.txt`.

**These translations have not been individually reviewed in this project.**
Some upstream entries appear machine-translated and have incorrect meanings.
Consumers must label each imported translation as a reference and make the
exact English source available directly or by click or tap in the message log
or information window. The filter reduces
some classes of mistakes; it does not
prove translation accuracy, completeness or applicability across variants.
Curated project translations take precedence.

The generator takes complete message entries from the upstream message, quest,
achievement, item effect, prayer, sound, status and trap groups, using exact,
case-sensitive keys. Long quest-line fragments are included because quest
reports can be emitted one line at a time; short generic fragments are excluded.
Upstream `=== TODO ===` prefixes are removed only from
the displayed translation; those entries remain explicitly marked as
unreviewed references in this application.
It excludes empty fields, controls and multiline content, edge whitespace,
text that does not look like a sentence, missing Japanese, editorial markers,
added parentheticals, ambiguous duplicate translations, formatting and likely
input-key syntax, changed Arabic numerals, English negations without a
recognized Japanese negation, and identification wording without recognized
Japanese equivalents. It also excludes individually identified bad
translations. These checks cannot detect all fragments or mistranslations.
The current result contains the number of entries reported by the generator;
statistics by first rejection
reason and the original file hash are in `nehww-import-report.json`.

`nehww-patterns.json` contains a separate, unreviewed subset of the upstream
patterns. Its generator accepts only anchored literals with one or two capture
slots, requires every captured value to be retained, rejects conflicting
patterns and performs additional checks for negation and input keys. Matching
uses bounded string operations, and ambiguous results are ignored. Captured
values are translated only when recognized; player names and unknown values
remain unchanged. As with exact reference entries, these are not verified
translations and their original text is available in the message history.
For patterns marked `=== TODO ===` upstream, the generator additionally
requires sentence-shaped input and removes that marker from the displayed
reference translation.

`nehww-entities.json` contains names present in both the source's `Entity`
group and the bundled NetHack 5.0 runtime. It excludes conflicting and
non-Japanese entries, checks colour names, and corrects the upstream mistranslation
of "baby red dragon". The application uses these only as display names with
recognized grammatical context, after its own manually maintained dictionary.

To regenerate, download the fixed revision of `dictionary.csv` to a local path,
verify its SHA-256 against the hash above, and run from the project root:

```
node scripts/i18n/import-nehww-messages.mjs path/to/dictionary.csv
node scripts/i18n/import-nehww-patterns.mjs path/to/dictionary.csv
node scripts/i18n/import-nehww-entities.mjs path/to/dictionary.csv
```

For NetHack 5.0, `node scripts/i18n/audit-nethack5-messages.mjs` reports
sentence-shaped candidates found in the bundled runtime, with separate counts
for format strings and exact translations. Add `--unmatched` to list plain
candidates without an exact dictionary entry. This is a triage aid, not a
coverage measurement: the runtime also contains internal strings, while
generated messages and translations handled by patterns are not counted.
Add `--all-sentences` to include candidates with any capitalized first word;
this broader list also contains more internal diagnostics.

To find NetHack messages that are still shown in English, extract sample
messages from a NetHack source checkout and run them through the display
translation:

```
node scripts/i18n/extract-source-messages.mjs path/to/NetHack/src samples.json
NH_MESSAGE_SAMPLES=samples.json npx vitest run src/i18n/source-message-coverage.test.ts
```

The test writes `samples-untranslated.tsv`. Argument values are guessed from
the C expressions, so some listed samples are nonsense; review it by hand and
add renderings for real messages to `nethack5-source-ja.json`. A format key may
spell out a runtime verb (`"%s toots."` for `pline("%s.", Tobjnam(obj, "toot"))`).
