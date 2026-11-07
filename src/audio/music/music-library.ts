import type { MusicMood } from "./music-director";

export type MusicTrack = {
  id: string;
  /** Path relative to the public asset base. */
  path: string;
  /**
   * "seamless": the file is an exact loop (use native looping).
   * "crossfade": the file has an intro/ending, loop by crossfading into itself.
   */
  loop: "seamless" | "crossfade";
  crossfadeSec?: number;
  /** Level trim for files that were not loudness-normalised (default 0). */
  gainDb?: number;
  title: string;
  author: string;
  license: string;
  source: string;
};

export type MusicLibrary = Record<MusicMood, readonly MusicTrack[]>;

/** Credit fields shared by the soundtrack's own pieces. */
const originalWork = {
  author: "NetHack 3D Plus (made with Suno)",
  license: "Original work; Suno Pro plan",
} as const;

/**
 * Bundled background music: the game's own soundtrack, built on the "Descent"
 * leitmotif. Each piece was sketched with scripts/music-sketch and finished
 * with Suno (Pro plan). The files are the MP3s Suno exported: they fade out
 * at the end, so they loop by crossfading, and gainDb brings them down to a
 * common level (about -24 dB, -22 dB for danger). Regions pick their tracks
 * in music-region.ts. Credits are also listed in public/licenses/music-credits.txt.
 */
export const defaultMusicLibrary: MusicLibrary = {
  calm: [
    {
      id: "dungeon",
      path: "music/dungeon.mp3",
      loop: "crossfade",
      crossfadeSec: 4,
      gainDb: -5,
      title: "Dungeons of Doom",
      ...originalWork,
      source: "scripts/music-sketch/pieces/dungeon.mjs",
    },
    {
      id: "mines",
      path: "music/mines.mp3",
      loop: "crossfade",
      crossfadeSec: 4,
      gainDb: -8,
      title: "Gnomish Mines",
      ...originalWork,
      source: "scripts/music-sketch/pieces/mines.mjs",
    },
    {
      id: "sokoban",
      path: "music/sokoban.mp3",
      loop: "crossfade",
      crossfadeSec: 4,
      gainDb: -6.5,
      title: "Sokoban",
      ...originalWork,
      source: "scripts/music-sketch/pieces/sokoban.mjs",
    },
    {
      id: "quest",
      path: "music/quest.mp3",
      loop: "crossfade",
      crossfadeSec: 4,
      gainDb: -4,
      title: "The Quest",
      ...originalWork,
      source: "scripts/music-sketch/pieces/quest.mjs",
    },
    {
      id: "medusa",
      path: "music/medusa.mp3",
      loop: "crossfade",
      crossfadeSec: 4,
      gainDb: -6.5,
      title: "Medusa's Island",
      ...originalWork,
      source: "scripts/music-sketch/pieces/medusa.mjs",
    },
    {
      id: "castle",
      path: "music/castle.mp3",
      loop: "crossfade",
      crossfadeSec: 4,
      gainDb: -4.5,
      title: "The Castle",
      ...originalWork,
      source: "scripts/music-sketch/pieces/castle.mjs",
    },
    {
      id: "gehennom",
      path: "music/gehennom.mp3",
      loop: "crossfade",
      crossfadeSec: 4,
      gainDb: -6.5,
      title: "Gehennom",
      ...originalWork,
      source: "scripts/music-sketch/pieces/gehennom.mjs",
    },
    {
      id: "astral",
      path: "music/astral.mp3",
      loop: "crossfade",
      crossfadeSec: 4,
      gainDb: -4.5,
      title: "The Astral Plane",
      ...originalWork,
      source: "scripts/music-sketch/pieces/astral.mjs",
    },
  ],
  combat: [
    {
      id: "combat",
      path: "music/combat.mp3",
      loop: "crossfade",
      crossfadeSec: 2,
      gainDb: -5,
      title: "Combat",
      ...originalWork,
      source: "scripts/music-sketch/pieces/combat-heavy.mjs",
    },
    {
      id: "combat-boss",
      path: "music/combat-boss.mp3",
      loop: "crossfade",
      crossfadeSec: 2,
      gainDb: -4,
      title: "Boss Combat",
      ...originalWork,
      source: "scripts/music-sketch/pieces/combat.mjs",
    },
    {
      id: "astral-combat",
      path: "music/astral-combat.mp3",
      loop: "crossfade",
      crossfadeSec: 2,
      gainDb: -3,
      title: "Astral Combat",
      ...originalWork,
      source: "scripts/music-sketch/pieces/astral-combat.mjs",
    },
    {
      // Only while the Wizard of Yendor is in view (see background-music.ts);
      // every region names its own combat tracks, so it never plays otherwise.
      id: "wizard",
      path: "music/wizard.mp3",
      loop: "crossfade",
      crossfadeSec: 1,
      gainDb: -4,
      title: "The Wizard of Yendor",
      ...originalWork,
      source: "scripts/music-sketch/pieces/wizard.mjs",
    },
  ],
  danger: [
    {
      id: "danger",
      path: "music/danger.mp3",
      loop: "crossfade",
      crossfadeSec: 3,
      gainDb: -3,
      title: "Danger",
      ...originalWork,
      source: "scripts/music-sketch/pieces/danger.mjs",
    },
  ],
};

/**
 * Played once when the player ascends. A Suno Cover of the title theme (style:
 * Symphony and Metal, fanfare, glorious, epic, dramatic, grand finale), not a
 * sketch of its own. It ends with a fade, so it does not need to loop.
 *
 * Deliberately about 6 dB louder than the other tracks. The file peaks at -5.7 dB
 * and the music volume adds up to 1.6 dB, so this trim stays below clipping.
 */
export const ascensionMusicTrack: MusicTrack = {
  id: "ascension",
  path: "music/ascension.mp3",
  loop: "crossfade",
  gainDb: 3,
  title: "Labyrinth of DOOM (Ascension)",
  ...originalWork,
  source: "scripts/music-sketch/pieces/title.mjs",
};

/** Title screen music (null = silent title screen), from pieces/title.mjs. */
export const titleMusicTrack: MusicTrack | null = {
  id: "title-theme",
  path: "music/title-theme.mp3",
  loop: "crossfade",
  crossfadeSec: 4,
  gainDb: -6,
  title: "Labyrinth of DOOM",
  ...originalWork,
  source: "scripts/music-sketch/pieces/title.mjs",
};
