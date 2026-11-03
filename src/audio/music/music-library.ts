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
 * Title screen music (null = silent title screen). An original piece: sketched
 * with scripts/music-sketch (pieces/title.mjs) and finished with Suno (Pro
 * plan). Kept as the MP3 Suno exported; it fades out at the end, so it loops
 * by crossfading, and it is about 7 dB hotter than the normalised tracks.
 */
export const titleMusicTrack: MusicTrack | null = {
  id: "title-theme",
  path: "music/title-theme.mp3",
  loop: "crossfade",
  crossfadeSec: 4,
  gainDb: -7,
  title: "NetHack 3D Plus Title Theme",
  author: "NetHack 3D Plus (made with Suno)",
  license: "Original work; Suno Pro plan",
  source: "scripts/music-sketch/pieces/title.mjs",
};
