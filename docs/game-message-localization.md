# Game message localization

The NetHack runtimes send English prose, not stable message identifiers. The
game's existing language selection also controls the presentation of recognized
game messages: Japanese translations cover common messages, the welcome
message, and a few combat and experience-level templates. Monster and item
names are translated where explicitly recognized. Unrecognized messages and all
other languages retain the original text, so information is not silently lost.

When no curated translation matches, the Japanese display next tries
JNetHack-derived data (`src/plus/game-text`, see its `NOTICE.md`): message
templates, monster/object/feature names, ranks, dungeon branches and quest
texts extracted from JNetHack's annotated sources. These are human translations,
so they are not marked. JNetHack's `，．` punctuation is normalized to `、。`.
Only if that also fails can the display use an
unreviewed Nehww exact or bounded-pattern translation marked `参考訳`. In the message log
and information window, selecting `参考訳・原文` reveals the original English;
floating reference translations display the reference label, with the original
available in the message log. These translations
may contain errors. The source, attribution,
filter and remaining limitations are documented in `src/i18n/data/README.md`.

The message dictionary covers the live message log, floating messages, and the
NetHack Message history dialog. A separate limited dictionary translates known
question, direction and text-entry prompts while preserving choice keys and
defaults. Known inventory categories and item descriptions are translated at
display time; unidentified appearances remain appearances, and descriptions
that cannot be translated safely are left intact. Known dungeon branch names
are translated in the status bar, along with known player ranks. Character
creation choices, known spell names, schools and skill ranks have Japanese
display labels while retaining their original selection identifiers. The complete
standard introductory story is recognized and translated as a document, with
deities and ranks filled in; unknown story variants remain unchanged. Runtime
status and recognized startup error details are also translated for display.
Unrecognized phrases, some names and descriptions, and the native terminal can
still contain English. The audit script identifies candidate untranslated
NetHack 5.0 strings, but cannot establish complete gameplay coverage.

## NetHack 5.0 source formats

`src/i18n/data/nethack5-source-ja.json` maps message formats taken from the
NetHack 5.0 C sources (upstream `f3fc8537a47331578fe6ba67a7949fe46d1486a8`) to
project-reviewed Japanese. Keys are the first string argument of `pline`,
`You`, `Your`, `You_feel`, `You_hear`, `You_see`, `You_cant`, `You_are`,
`pline_The`, `There`, `Norep` and `verbalize`, including the implicit prefix.
`{n}` in a translation is the n-th printf conversion; a conversion that only
carries English grammar (an article, verb ending or punctuation) may be
omitted. `src/i18n/nethack5-source-messages.ts` compiles the keys into anchored
patterns, translates captured monsters, items, features and body parts when
recognized, keeps names verbatim, and rejects a match that would leave an
unrecognized multi-word English phrase inside Japanese text. It runs after all
curated exact entries and templates, and before unreviewed Nehww references.

Formats whose conversions carry verbs or sentence fragments assembled at
runtime are intentionally not listed in that table. Frequent assembled
messages are instead recognized as complete sentences in
`src/i18n/nethack5-assembled-messages.ts`, one template per source
construction (melee and missile verbs with `exclam()` punctuation, shopkeeper
greetings and price quotes, erosion, engraving, prayer results, occupations,
eating feedback and object prompts). These run before the older curated
templates. A template whose capture spans a sentence boundary is rejected so
joined messages stay in English. Pile listings that consist only of an object
description (for example `a green gem (for sale, 3750 zorkmids)`) are
translated by the inventory dictionary, and hunger/encumbrance badges by
`src/i18n/status-text.ts`. To review what remains, check out the
NetHack source revision above and run
`node scripts/i18n/audit-nethack5-source.mjs <NetHack source dir> --list`.
Messages built with `Sprintf`/`Strcat`, quest texts, rumors, oracles,
epitaphs and other data-file text are outside this table.

Keep runtime messages in English in the engine and state store. Sound effects,
combat attribution, run history and other behavior depend on that text. Add
translations in `src/i18n/game-messages.ts` only for complete, unambiguous
messages or carefully anchored templates, and add focused examples in the
adjacent test file. Add exact prompt translations in `src/i18n/game-prompts.ts`;
the untranslated prompt remains authoritative for parsing and input. Item
display translations live in `src/i18n/inventory-text.ts`; never infer an
unidentified item's effect. Do not modify item names in state, user input,
command keys or raw runtime payloads. Unmatched text must continue to fall back
to the original.

## Encyclopedia (data.base)

`src/i18n/data/encyclopedia-ja.txt` holds Japanese text for all 515 entries of
NetHack 5's `dat/data.base`. Each entry starts with `@@ <hash> <first key>`,
where the hash is FNV-1a (32-bit) of the English body with whitespace collapsed
to single spaces. `src/i18n/encyclopedia-text.ts` hashes the lines of an
information window the same way and replaces the whole body only on an exact
match, so a changed upstream entry falls back to English. When `data.base`
changes, retranslate the changed entries and recompute their hashes.
