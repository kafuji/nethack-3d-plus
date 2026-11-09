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
