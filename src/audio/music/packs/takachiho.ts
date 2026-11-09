import type { MusicTrack } from "../music-library";
import type { MusicPack } from "../music-pack";

/** Credit fields shared by the pack's pieces. */
const originalWork = {
  author: "NetHack 3D Plus (made with Suno)",
  license: "Original work; Suno Pro plan",
} as const;

/** One track of the pack: its file is public/music/takachiho/<file>.mp3. */
function track(
  id: string,
  file: string,
  title: string,
  piece: string,
  options: Pick<MusicTrack, "crossfadeSec" | "gainDb">,
): MusicTrack {
  return {
    id,
    path: `music/takachiho/${file}.mp3`,
    loop: "crossfade",
    title,
    ...originalWork,
    source: `scripts/music-sketch/pieces/${piece}.mjs`,
    ...options,
  };
}

/**
 * Takachiho: the game's own soundtrack, built on the "Descent" leitmotif. Each
 * piece was sketched with scripts/music-sketch and finished with Suno (Pro
 * plan). The files are the MP3s Suno exported: they fade out at the end, so
 * they loop by crossfading, and gainDb brings them down to a common level
 * (about -24 dB, -22 dB for danger). Credits are also listed in
 * public/licenses/music-credits.txt.
 */
export const takachihoMusicPack: MusicPack = {
  id: "takachiho",
  name: "Takachiho",
  library: {
    calm: [
      track("dungeon", "dungeon", "Dungeons of Doom", "dungeon", { crossfadeSec: 4, gainDb: -5 }),
      track("mines", "mines", "Gnomish Mines", "mines", { crossfadeSec: 4, gainDb: -8 }),
      track("sokoban", "sokoban", "Sokoban", "sokoban", { crossfadeSec: 4, gainDb: -6.5 }),
      track("quest", "quest", "The Quest", "quest", { crossfadeSec: 4, gainDb: -4 }),
      track("medusa", "medusa", "Medusa's Island", "medusa", { crossfadeSec: 4, gainDb: -6.5 }),
      track("castle", "castle", "The Castle", "castle", { crossfadeSec: 4, gainDb: -4.5 }),
      track("gehennom", "gehennom", "Gehennom", "gehennom", { crossfadeSec: 4, gainDb: -6.5 }),
      track("astral", "astral", "The Astral Plane", "astral", { crossfadeSec: 4, gainDb: -4.5 }),
    ],
    combat: [
      track("combat", "combat", "Combat", "combat-heavy", { crossfadeSec: 2, gainDb: -5 }),
      track("combat-boss", "combat-boss", "Boss Combat", "combat", { crossfadeSec: 2, gainDb: -4 }),
      track("astral-combat", "astral-combat", "Astral Combat", "astral-combat", { crossfadeSec: 2, gainDb: -3 }),
      // Only while the Wizard of Yendor is on the map: every region names its
      // own combat tracks, so it never plays otherwise.
      track("wizard", "wizard", "The Wizard of Yendor", "wizard", { crossfadeSec: 1, gainDb: -4 }),
    ],
    danger: [track("danger", "danger", "Danger", "danger", { crossfadeSec: 3, gainDb: -3 })],
  },
  // The faster boss-combat piece is kept for the deep and dangerous places.
  regionTracks: {
    dungeon: { calm: ["dungeon"], combat: ["combat"] },
    medusa: { calm: ["medusa"], combat: ["combat"] },
    castle: { calm: ["castle"], combat: ["combat-boss"] },
    mines: { calm: ["mines"], combat: ["combat"] },
    sokoban: { calm: ["sokoban"], combat: ["combat"] },
    quest: { calm: ["quest"], combat: ["combat"] },
    ludios: { calm: ["dungeon"], combat: ["combat-boss"] },
    gehennom: { calm: ["gehennom"], combat: ["combat-boss"] },
    endgame: { calm: ["astral"], combat: ["astral-combat"] },
  },
  titleTrack: track("title-theme", "title-theme", "Labyrinth of DOOM", "title", { crossfadeSec: 4, gainDb: -6 }),
  // A Suno Cover of the title theme (Symphony and Metal, fanfare, glorious,
  // epic, dramatic, grand finale), not a sketch of its own. It plays once.
  // Deliberately about 5.5 dB louder than the other tracks: the file peaks at
  // -3.5 dB and the music volume adds up to 1.6 dB, so this stays below clipping.
  ascensionTrack: track("ascension", "ascension", "Labyrinth of DOOM (Ascension)", "title", { gainDb: 1 }),
  wizardTrackId: "wizard",
};
