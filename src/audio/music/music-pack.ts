import type { MusicLibrary, MusicTrack } from "./music-library";
import type { MusicRegion, TrackPreference } from "./music-region";
import { takachihoMusicPack } from "./packs/takachiho";

/**
 * A complete set of background music, chosen in the options like a tileset or
 * a sound pack. Its files live under public/music/<id>/.
 */
export type MusicPack = {
  id: string;
  /** Shown in the options; a proper name, so it is not translated. */
  name: string;
  /** Tracks per mood. Regions pick from these by id. */
  library: MusicLibrary;
  /**
   * Track ids per mood for each region. A mood listed here plays only these
   * tracks (in order) while in the region; unlisted moods use the whole library.
   */
  regionTracks: Readonly<Record<MusicRegion, TrackPreference>>;
  /** Title screen music; null keeps the title screen silent. */
  titleTrack: MusicTrack | null;
  /** Played once on ascension; null leaves it silent. */
  ascensionTrack: MusicTrack | null;
  /** Combat track that takes over while the Wizard of Yendor is on the map. */
  wizardTrackId: string | null;
};

/** The value of the "none" choice: no background music at all. */
export const NO_MUSIC_PACK_ID = "none";

export const musicPacks: readonly MusicPack[] = [takachihoMusicPack];

export const defaultMusicPackId = takachihoMusicPack.id;

/** The pack for an option value, or null for "none" (and unknown ids). */
export function resolveMusicPack(id: string | null | undefined): MusicPack | null {
  return musicPacks.find((pack) => pack.id === id) ?? null;
}

/** Normalizes a saved option value; an unknown pack falls back to the default. */
export function normalizeMusicPackId(id: unknown, legacyMusicEnabled?: unknown): string {
  if (id === NO_MUSIC_PACK_ID) return NO_MUSIC_PACK_ID;
  if (typeof id === "string" && resolveMusicPack(id)) return id;
  // Options saved before packs had a plain on/off switch.
  if (id === undefined && legacyMusicEnabled === false) return NO_MUSIC_PACK_ID;
  return defaultMusicPackId;
}
