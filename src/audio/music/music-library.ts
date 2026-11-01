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
  title: string;
  author: string;
  license: string;
  source: string;
};

export type MusicLibrary = Record<MusicMood, readonly MusicTrack[]>;

/**
 * Bundled background music. All tracks are CC0 (public domain) from
 * OpenGameArt.org; loudness-normalised and re-encoded to Ogg Vorbis.
 * Credits are also listed in public/licenses/music-credits.txt.
 */
export const defaultMusicLibrary: MusicLibrary = {
  calm: [
    {
      id: "calm-dungeon",
      path: "music/calm-dungeon.ogg",
      loop: "crossfade",
      crossfadeSec: 4,
      title: "Dungeon Ambience",
      author: "yd",
      license: "CC0 1.0",
      source: "https://opengameart.org/content/dungeon-ambience",
    },
    {
      id: "calm-unexplored",
      path: "music/calm-unexplored.ogg",
      loop: "crossfade",
      crossfadeSec: 3,
      title: "Unexplored Expansion",
      author: "TAD / Bo Jingles",
      license: "CC0 1.0",
      source: "https://opengameart.org/content/unexplored-expansion",
    },
  ],
  combat: [
    {
      id: "combat-battle-theme-a",
      path: "music/combat-battle-theme-a.ogg",
      loop: "crossfade",
      crossfadeSec: 2,
      title: "Battle Theme A",
      author: "cynicmusic",
      license: "CC0 1.0",
      source: "https://opengameart.org/content/battle-theme-a",
    },
    {
      id: "combat-determined-pursuit",
      path: "music/combat-determined-pursuit.ogg",
      loop: "seamless",
      title: "Determined Pursuit (epic orchestra loop)",
      author: "Emma_MA",
      license: "CC0 1.0",
      source: "https://opengameart.org/content/determined-pursuit-epic-orchestra-loop",
    },
  ],
  danger: [
    {
      id: "danger-tension-and-distress",
      path: "music/danger-tension-and-distress.ogg",
      loop: "seamless",
      title: "Tension and Distress",
      author: "Allen Yatsura",
      license: "CC0 1.0",
      source: "https://opengameart.org/content/tension-and-distress",
    },
    {
      id: "danger-panic-mode",
      path: "music/danger-panic-mode.ogg",
      loop: "seamless",
      title: "Panic Mode",
      author: "Breadman",
      license: "CC0 1.0",
      source: "https://opengameart.org/node/114093",
    },
  ],
};

/**
 * Title screen music. Reuses the bundled "Unexplored Expansion" piece, which
 * the default dungeon region does not open with, so the game start still
 * sounds different from the menu.
 */
export const titleMusicTrack: MusicTrack = {
  id: "title-unexplored",
  path: "music/calm-unexplored.ogg",
  loop: "crossfade",
  crossfadeSec: 3,
  title: "Unexplored Expansion",
  author: "TAD / Bo Jingles",
  license: "CC0 1.0",
  source: "https://opengameart.org/content/unexplored-expansion",
};
