import { describe, expect, it, vi } from "vitest";
import { defaultMusicPackId, musicPacks, normalizeMusicPackId, NO_MUSIC_PACK_ID, resolveMusicPack } from "./music-pack";

describe("music packs", () => {
  it.each(musicPacks.map((pack) => [pack.id, pack] as const))("%s refers only to its own files and tracks", async (id, pack) => {
    // The app's tsconfig has no Node types, as in the i18n coverage tests.
    const { existsSync } = await vi.importActual<{ existsSync: (path: string) => boolean }>("node:fs");
    const tracks = Object.values(pack.library).flat();
    const ids = new Set(tracks.map((track) => track.id));
    for (const preference of Object.values(pack.regionTracks)) {
      for (const list of Object.values(preference)) {
        for (const trackId of list ?? []) expect(ids.has(trackId)).toBe(true);
      }
    }
    if (pack.wizardTrackId) expect(pack.library.combat.map((track) => track.id)).toContain(pack.wizardTrackId);
    for (const track of [...tracks, pack.titleTrack, pack.ascensionTrack]) {
      if (!track) continue;
      expect(track.path.startsWith(`music/${id}/`)).toBe(true);
      expect(existsSync(`public/${track.path}`)).toBe(true);
    }
  });

  it("gives Takachiho's Medusa and Castle their own tracks", () => {
    const regions = resolveMusicPack("takachiho")!.regionTracks;
    expect(regions.medusa.calm).toEqual(["medusa"]);
    expect(regions.castle.calm).toEqual(["castle"]);
    expect(regions.castle.combat).toEqual(["combat-boss"]);
  });

  it("resolves \"none\" and unknown ids to no pack", () => {
    expect(resolveMusicPack(NO_MUSIC_PACK_ID)).toBeNull();
    expect(resolveMusicPack("missing")).toBeNull();
  });
});

describe("normalizeMusicPackId", () => {
  it("defaults to Takachiho", () => {
    expect(defaultMusicPackId).toBe("takachiho");
    expect(normalizeMusicPackId(undefined)).toBe("takachiho");
    expect(normalizeMusicPackId("removed-pack")).toBe("takachiho");
  });

  it("keeps \"none\" and known packs", () => {
    expect(normalizeMusicPackId("none")).toBe("none");
    expect(normalizeMusicPackId("takachiho")).toBe("takachiho");
  });

  it("turns the old music switch into \"none\" only when it was off", () => {
    expect(normalizeMusicPackId(undefined, false)).toBe("none");
    expect(normalizeMusicPackId(undefined, true)).toBe("takachiho");
    expect(normalizeMusicPackId("takachiho", false)).toBe("takachiho");
  });
});
