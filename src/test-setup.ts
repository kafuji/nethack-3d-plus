// Node 21+ has a global navigator that reports the machine's language, and
// src/i18n/core.ts picks its locale from it when imported. Remove it so the
// suite runs in the same locale everywhere; a test that needs Japanese display
// text passes "ja" or calls loadJapaneseDictionary().
delete (globalThis as { navigator?: unknown }).navigator;
